# Student Report Generation Feature

## Overview

This document describes the implementation of the AI-powered student learning report generation feature. The system generates comprehensive PDF reports containing student profiles, course information, performance analytics, and visualizations.

## Architecture

### System Flow

```
User Request → Learning Agent → Database Queries → AI Chart Generation → AI HTML Generation → Puppeteer PDF → MinIO Upload → Download API → User
```

### Key Components

1. **Learning Agent Tool** (`app/services/learning-agent-v2.server.ts`)
   - Orchestrates the entire report generation process
   - Queries student data from database
   - Uses Gemini to generate chart configurations and HTML content
   - Converts HTML to PDF using Puppeteer
   - Uploads to MinIO and returns download URL

2. **Database Query Service** (`app/services/database-query.server.ts`)
   - Provides type-safe database access for student data
   - Supports multiple query types: user profile, courses, submissions, statistics

3. **Storage Service** (`app/services/storage.server.ts`)
   - Handles MinIO/S3 file operations
   - Provides presigned URL generation (not used in final implementation)

4. **Download API** (`app/routes/api.reports.download.ts`)
   - Serves generated PDF files
   - Validates user permissions (users can only download their own reports)
   - Supports range requests for efficient PDF viewing

## Implementation Details

### 1. Docker Environment Setup

**Files:** `Dockerfile.dev` (development) and `Dockerfile` (production)

**Purpose:** Install Chromium and Chinese fonts for Puppeteer PDF generation

**Note:** Both development and production Dockerfiles need the same Chromium and font setup

```dockerfile
# Install Chrome dependencies and Chinese fonts for Puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-sandbox \
    fonts-liberation \
    fonts-wqy-zenhei \        # WenQuanYi Zen Hei
    fonts-wqy-microhei \      # WenQuanYi Micro Hei
    fonts-noto-cjk \          # Noto Sans CJK
    fonts-noto-cjk-extra \    # Noto Sans CJK Extra
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

**Key Points:**
- Changed from `node:22-alpine` to `node:22-slim` for better Chromium compatibility
- Installed multiple Chinese font packages for UTF-8/CJK character support
- Set environment variables to use system Chromium instead of downloading
- **IMPORTANT:** Both `Dockerfile.dev` and `Dockerfile` (production) must have identical Chromium/font setup
- Production uses multi-stage build, but final stage still needs Chromium (Puppeteer runs at runtime, not build time)

### 2. Type Definitions

**File:** `app/services/database-query.server.ts`

**Purpose:** Provide type-safe interfaces for database query results

```typescript
export interface StudentCoursesData {
  totalCourses: number;
  courses: Array<{
    courseId: string;
    courseName: string;
    courseCode: string | null;
    classNames: string | null;
    teacherName: string;
    enrolledAt: string | null;
    totalClasses: number;
  }>;
}

export interface StudentSubmissionsData {
  totalSubmissions: number;
  submissions: Array<{
    submissionId: string;
    assignmentName: string;
    courseName: string;
    submittedAt: string | null;
    status: string;
    finalScore: number | null;
    normalizedScore: number | null;
  }>;
}
```

**Key Points:**
- Co-located with implementation for better maintainability
- Avoids using `any` type for type safety
- Exported for use in learning agent

### 3. Report Generation Tool

**File:** `app/services/learning-agent-v2.server.ts`

**Function:** `generateStudentReportTool`

**Process Steps:**

#### Step 1: Query Student Data

```typescript
const [userProfile, userStats, studentCourses, studentSubmissions] = await Promise.all([
  executeDatabaseQuery('user_profile', { userId }),
  executeDatabaseQuery('user_statistics', { userId }),
  executeDatabaseQuery('student_courses', { userId }),
  executeDatabaseQuery('student_submissions', { userId, limit: 20 }),
]);
```

**Key Points:**
- Parallel queries using `Promise.all()` for performance
- Type-safe casting using defined interfaces
- Handles missing data gracefully

#### Step 2: Generate Chart Configurations

```typescript
const { object: chartData } = await generateObject({
  model: gemini('gemini-2.5-flash'),
  schema: z.object({
    charts: z.array(
      z.object({
        type: z.enum(['bar', 'line', 'pie', 'doughnut', 'radar']),
        title: z.string(),
        config: z.any(),
      })
    ),
  }),
  prompt: `Generate 2-3 Chart.js configurations for visualizing student data...`,
});
```

**Key Points:**
- Uses Gemini to intelligently create relevant visualizations
- Structured output with Zod schema validation
- Chart.js compatible configuration format

#### Step 3: Generate HTML Report

```typescript
const { text: htmlReport } = await generateText({
  model: gemini('gemini-2.5-flash'),
  prompt: `You are an expert educational report writer.
  Generate a comprehensive, professional HTML learning report for a student.

  **Instructions:**
  1. Create a complete HTML document with proper structure and UTF-8 charset: <meta charset="UTF-8">
  2. Use modern, clean CSS styling (embedded in <style> tag)
  3. IMPORTANT: Add Chinese font support in CSS with: font-family: 'Noto Sans CJK TC', 'WenQuanYi Zen Hei', 'Microsoft YaHei', sans-serif;
  4. Include the student's profile, course list, performance summary, and insights
  5. If charts are provided, create <canvas> elements and <script> blocks to render them
  6. Provide actionable insights and recommendations for improvement
  7. Use a professional, encouraging tone in Traditional Chinese (繁體中文)
  8. Include proper headings, sections, and formatting
  ...`,
});
```

**Key Points:**
- Explicit instruction for UTF-8 charset in HTML
- Specifies Chinese font families matching installed fonts
- Requests Traditional Chinese (繁體中文) output
- Includes Chart.js CDN and chart rendering code

#### Step 4: Convert HTML to PDF using Puppeteer

```typescript
const browser = await puppeteer.launch({
  headless: true,
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
  ],
});

const page = await browser.newPage();
await page.setContent(htmlReport, { waitUntil: 'networkidle0' });

const pdfPath = path.join(tmpdir(), pdfFileName);
await page.pdf({
  path: pdfPath,
  format: 'A4',
  printBackground: true,
  margin: {
    top: '20mm',
    right: '20mm',
    bottom: '20mm',
    left: '20mm',
  },
});

await browser.close();
```

**Key Points:**
- Uses system Chromium via environment variable
- Docker-compatible args (`--no-sandbox`, `--disable-setuid-sandbox`)
- Waits for network idle to ensure charts are rendered
- Saves to temporary directory (OS-provided tmpdir)
- A4 format with reasonable margins

#### Step 5: Upload to MinIO

```typescript
const storageKey = `reports/${userId}/${pdfFileName}`;
const pdfBuffer = await fs.readFile(pdfPath);

await uploadToStorage(
  pdfBuffer,
  storageKey,
  'application/pdf'
);

logger.info({ storageKey, fileSize }, '[Learning Agent V2] PDF uploaded to storage');

// Clean up temporary file
await fs.unlink(pdfPath);
```

**Key Points:**
- Storage key format: `reports/{userId}/{filename}.pdf`
- Organized by user ID for easy management and permission checking
- Cleans up temporary files after upload
- Proper error handling and logging

#### Step 6: Return Download URL

```typescript
const downloadUrl = `/api/reports/download?key=${encodeURIComponent(storageKey)}`;

return {
  success: true,
  message: '📊 學習報告生成成功！',
  pdfUrl: downloadUrl,
  pdfFileName,
  storageKey,
  reportSections: {
    hasProfile: !!userProfile.data,
    coursesCount: coursesData?.courses?.length || 0,
    submissionsCount: submissionsData?.submissions?.length || 0,
    chartsCount: chartConfigs.length,
  },
  downloadInstructions: '點擊下載連結即可取得報告 PDF 檔案',
  markdownResponse: `✅ **學習報告已生成完成！**

📊 **報告內容：**
- ${userProfile.data ? '✓' : '✗'} 個人檔案
- 📚 ${coursesData?.courses?.length || 0} 門課程
- 📝 ${submissionsData?.submissions?.length || 0} 份作業提交
- 📈 ${chartConfigs.length} 個圖表分析

📥 **[點擊這裡下載報告](${downloadUrl})**

檔案名稱：${pdfFileName}`,
};
```

**Key Points:**
- Returns relative URL (works in dev and production)
- Provides both structured data and markdown formatted response
- User-friendly Traditional Chinese messages
- Clickable download link in markdown format

### 4. Download API

**File:** `app/routes/api.reports.download.ts`

**Route:** `GET /api/reports/download?key=reports/userId/filename.pdf`

**Features:**

1. **Authentication Check**
```typescript
userId = await getUserId(request);
if (!userId) {
  return Response.json(createErrorResponse('用戶未認證', ApiErrorCode.UNAUTHORIZED), {
    status: 401,
  });
}
```

2. **Permission Validation**
```typescript
const expectedPrefix = `reports/${userId}/`;
if (!storageKey.startsWith(expectedPrefix)) {
  logger.warn('Unauthorized report download attempt', {
    userId,
    requestedKey: storageKey,
    expectedPrefix,
  });

  return Response.json(createErrorResponse('無權訪問此報告', ApiErrorCode.FORBIDDEN), {
    status: 403,
  });
}
```

**Key Points:**
- Only allows users to download reports from their own folder
- Prevents path traversal attacks
- Logs unauthorized access attempts

3. **Stream from Storage**
```typescript
const fileStream = await streamFromStorage(storageKey);

const headers = new Headers({
  'Content-Type': fileStream.contentType,
  'Content-Length': fileStream.contentLength.toString(),
  'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
  'Cache-Control': 'private, max-age=3600',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Range, Content-Type',
});
```

4. **Range Request Support**
```typescript
const range = request.headers.get('range');
if (range) {
  const matches = range.match(/bytes=(\d+)-(\d*)/);
  if (matches) {
    const start = parseInt(matches[1], 10);
    const end = matches[2] ? parseInt(matches[2], 10) : fileStream.contentLength - 1;
    const chunkSize = end - start + 1;

    headers.set('Content-Range', `bytes ${start}-${end}/${fileStream.contentLength}`);
    headers.set('Content-Length', chunkSize.toString());

    return new Response(webStream, {
      status: 206, // Partial Content
      headers,
    });
  }
}
```

**Key Points:**
- Supports partial content requests (HTTP 206)
- Enables efficient PDF viewing in browser
- Streams directly from MinIO to client (no buffering)

### 5. Route Registration

**File:** `app/routes.ts`

```typescript
// Report download API route
route('/api/reports/download', './routes/api.reports.download.ts'),
```

**Key Points:**
- Must register route in routes.ts for React Router v7
- Place near other file/download related routes for organization

## Environment-Specific Considerations

### Development Environment

**URL Format:**
```
http://localhost:3000/api/reports/download?key=reports/user-id/student-report-xxx.pdf
```

**MinIO Access:**
- Internal hostname: `minio:9000` (Docker network)
- External access: `localhost:9000` (port mapping)
- Download API handles translation automatically

### Production Environment (Kubernetes)

**URL Format:**
```
https://your-domain.com/api/reports/download?key=reports/user-id/student-report-xxx.pdf
```

**Benefits of Using Download API:**
1. **Environment Independence:** Same URL works everywhere
2. **Security:** No direct MinIO exposure
3. **Access Control:** Built-in permission checking
4. **Short URLs:** Clean, user-friendly links
5. **Scalability:** Works across multiple pods

**MinIO Configuration:**
- Each pod connects to MinIO via internal service name
- No need for public endpoint configuration
- Centralized storage accessible by all pods

## Error Handling

### Common Errors and Solutions

1. **Puppeteer Chrome Not Found**
   - **Error:** `Failed to launch browser process: ENOENT`
   - **Solution:** Ensure Chromium is installed in Docker image
   - **Check:** Run `docker compose exec app which chromium`

2. **Chinese Characters Not Rendering**
   - **Error:** PDF shows squares or missing characters
   - **Solution:** Install Chinese fonts in Dockerfile
   - **Verify:** Check fonts are installed: `docker compose exec app fc-list | grep -i noto`

3. **Permission Denied on Report Download**
   - **Error:** 403 Forbidden
   - **Cause:** User trying to access another user's report
   - **Check:** Storage key must start with `reports/{userId}/`

4. **MinIO Connection Failed**
   - **Error:** Cannot connect to MinIO
   - **Check:** Verify MinIO container is running
   - **Debug:** Check environment variables (MINIO_ENDPOINT, MINIO_PORT)

## Testing

### Manual Testing Steps

1. **Login as Student**
   ```
   Navigate to: http://localhost:3000/student
   ```

2. **Open Agent Chat**
   ```
   Navigate to: http://localhost:3000/agent-playground
   Or use embedded chat interface
   ```

3. **Request Report Generation**
   ```
   User message: "幫我生成學習報告"
   ```

4. **Verify Response**
   - Should receive markdown formatted message
   - Should contain clickable download link
   - Link format: `/api/reports/download?key=reports/...`

5. **Download PDF**
   - Click the download link
   - Should trigger browser download
   - Verify PDF contains:
     - Chinese characters rendered correctly
     - Student profile information
     - Course list
     - Charts and visualizations
     - Insights and recommendations

6. **Check MinIO Storage**
   ```bash
   # Access MinIO console
   http://localhost:9001

   # Login with: minioadmin / minioadmin
   # Navigate to bucket: grading-files
   # Check folder: reports/{userId}/
   ```

### Testing Permissions

1. **Login as Different User**
2. **Try to Access Another User's Report**
   ```
   GET /api/reports/download?key=reports/other-user-id/report.pdf
   ```
3. **Should Receive 403 Forbidden**

## Performance Considerations

### PDF Generation Time

**Typical Duration:** 15-30 seconds
- Database queries: 1-2s
- Chart generation (AI): 3-5s
- HTML generation (AI): 5-10s
- PDF rendering: 5-10s
- Upload to MinIO: 1-2s

**Optimization Opportunities:**
1. Cache frequently accessed data
2. Reuse chart configurations for similar students
3. Implement queue system for batch report generation
4. Optimize Puppeteer launch time (reuse browser instances)

### Storage Considerations

**File Size:** Typically 200KB - 2MB per report

**Retention Policy:**
- Reports stored indefinitely by default
- Consider implementing cleanup:
  - Delete reports older than 90 days
  - Keep only latest N reports per user
  - Implement storage quota per user

**Implementation Example:**
```typescript
// Cleanup old reports (could be a cron job)
async function cleanupOldReports(userId: string, keepCount: number = 5) {
  const prefix = `reports/${userId}/`;
  const files = await listFilesInStorage(prefix);

  // Sort by creation date, keep latest N
  const sortedFiles = files.sort((a, b) => b.lastModified - a.lastModified);
  const filesToDelete = sortedFiles.slice(keepCount);

  for (const file of filesToDelete) {
    await deleteFromStorage(file.key);
  }
}
```

## Security Considerations

### 1. Access Control

**Current Implementation:**
- Users can only download their own reports
- Storage key validation prevents path traversal
- Authentication required for all operations

**Future Enhancements:**
- Add role-based access (teachers can view student reports)
- Implement report sharing with time-limited tokens
- Add audit logging for sensitive operations

### 2. Input Validation

**Current Implementation:**
- Storage key parameter validation
- User ID validation from session
- File type restrictions (PDF only)

**Best Practices:**
- Never trust client input
- Validate all query parameters
- Sanitize file names and paths

### 3. Rate Limiting

**Recommendation:**
Implement rate limiting for report generation:

```typescript
// Example rate limit: 5 reports per user per hour
const RATE_LIMIT = {
  maxReports: 5,
  windowMs: 60 * 60 * 1000, // 1 hour
};
```

**Reasons:**
- Prevent abuse and resource exhaustion
- Limit AI API costs
- Protect Puppeteer/Chrome resources

## Monitoring and Logging

### Key Metrics to Track

1. **Report Generation Success Rate**
   ```typescript
   logger.info('[Learning Agent V2] Report generation completed', {
     userId,
     duration: endTime - startTime,
     fileSize,
     success: true,
   });
   ```

2. **PDF Generation Time**
   - Track each step duration
   - Identify bottlenecks
   - Alert on slow generation (>60s)

3. **Storage Usage**
   - Total reports generated
   - Storage size per user
   - Growth rate

4. **Error Rates**
   - Puppeteer failures
   - MinIO connection errors
   - Permission denied attempts

### Log Examples

**Success:**
```
[Learning Agent V2] PDF generated successfully
  pdfPath: "/tmp/student-report-xxx.pdf"
  fileSize: 919669
  userId: "617f5e8a-3f5a-4b6c-ba30-1295535ed5ae"
  duration: 25431ms
```

**Error:**
```
[Learning Agent V2] Generate student report failed
  userId: "..."
  error: "Failed to launch browser"
  stack: "..."
```

## Troubleshooting Guide

### Issue: PDF is Blank or Missing Content

**Possible Causes:**
1. Gemini didn't generate valid HTML
2. Chart.js CDN failed to load
3. Puppeteer didn't wait for content to render

**Solutions:**
1. Check HTML output in logs
2. Increase `waitUntil` timeout
3. Add explicit wait for chart rendering:
   ```typescript
   await page.waitForSelector('canvas', { timeout: 10000 });
   ```

### Issue: Chinese Characters Show as Boxes

**Possible Causes:**
1. Fonts not installed in Docker
2. CSS doesn't specify Chinese fonts
3. Wrong charset in HTML

**Solutions:**
1. Rebuild Docker with fonts: `docker compose build app`
2. Verify font installation: `docker compose exec app fc-list | grep -i cjk`
3. Check HTML has: `<meta charset="UTF-8">`
4. Check CSS has Chinese fonts in font-family

### Issue: Download Link Doesn't Work

**Possible Causes:**
1. Route not registered in routes.ts
2. File was deleted or expired
3. Permission issue

**Solutions:**
1. Check routes.ts has report download route
2. Check MinIO bucket for file existence
3. Verify user ID matches file path
4. Check browser console for errors

## Future Enhancements

### 1. Template System

**Current:** AI generates HTML from scratch each time
**Proposed:** Use predefined templates with AI filling in content

**Benefits:**
- Consistent styling across reports
- Faster generation time
- Reduced AI token usage
- Easier to maintain and update design

### 2. Report Scheduling

**Feature:** Allow users to schedule automatic report generation

**Implementation:**
```typescript
// Cron job or scheduled task
async function generateMonthlyReports() {
  const students = await getAllStudents();

  for (const student of students) {
    await generateStudentReportTool.execute({
      userId: student.id,
    });

    // Send email notification with download link
    await sendEmail(student.email, {
      subject: '您的學習報告已準備好',
      downloadUrl: `/api/reports/download?key=reports/${student.id}/...`,
    });
  }
}
```

### 3. Report Customization

**Feature:** Allow users to customize report content

**Options:**
- Select which sections to include
- Choose date range for data
- Select specific courses
- Custom insights and goals

### 4. Export Formats

**Current:** PDF only
**Future:** Support multiple formats

**Formats:**
- PDF (current)
- HTML (interactive, web-based)
- Word/DOCX (editable)
- JSON (raw data for integration)

### 5. Comparison Reports

**Feature:** Compare performance across time periods

**Example:**
- Month-over-month progress
- Semester comparison
- Year-over-year trends
- Peer comparison (anonymized)

## References

### Documentation Links

- [Puppeteer API](https://pptr.dev/)
- [Chart.js Documentation](https://www.chartjs.org/docs/)
- [MinIO Documentation](https://min.io/docs/)
- [Google Gemini API](https://ai.google.dev/docs)

### Related Code

- Database Query Service: `app/services/database-query.server.ts`
- Storage Service: `app/services/storage.server.ts`
- Learning Agent V2: `app/services/learning-agent-v2.server.ts`
- Download API: `app/routes/api.reports.download.ts`

### Dependencies

```json
{
  "puppeteer": "^24.29.1",
  "chart.js": "^4.5.1",
  "@aws-sdk/client-s3": "^3.802.0",
  "@google/generative-ai": "^0.24.0"
}
```

## Conclusion

This implementation provides a complete, production-ready student report generation system with:

- ✅ AI-powered content generation
- ✅ Professional PDF output with charts
- ✅ Full Chinese/UTF-8 support
- ✅ Secure download with permission checking
- ✅ Environment-independent URLs
- ✅ Scalable storage with MinIO
- ✅ Comprehensive error handling
- ✅ Detailed logging and monitoring

The system is designed to work seamlessly in both development and production environments, with proper security, performance, and maintainability considerations.
