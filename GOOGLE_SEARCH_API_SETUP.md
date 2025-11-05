# 🔍 Google Custom Search API Setup Guide

Complete guide to enable real web search in the AI Learning Agent playground.

---

## 📋 What You Need

1. **Google Account** (free)
2. **Google Cloud Project** (free tier available)
3. **Custom Search Engine** (free to create)
4. **5-10 minutes** of setup time

---

## 🚀 Step-by-Step Setup

### Step 1: Create a Google Cloud Project

1. Go to **Google Cloud Console**: https://console.cloud.google.com/

2. Click **"Select a project"** → **"New Project"**

3. Enter project details:
   - **Project name**: `learning-agent` (or your choice)
   - **Location**: Leave as default
   - Click **"Create"**

4. Wait for project creation (takes ~10 seconds)

---

### Step 2: Enable Custom Search API

1. In your new project, go to **APIs & Services** → **Library**
   - Or visit: https://console.cloud.google.com/apis/library

2. Search for **"Custom Search API"**

3. Click on **"Custom Search API"**

4. Click **"Enable"** button

5. Wait for API to be enabled (~5 seconds)

---

### Step 3: Create API Credentials

1. Go to **APIs & Services** → **Credentials**
   - Or visit: https://console.cloud.google.com/apis/credentials

2. Click **"+ Create Credentials"** → **"API Key"**

3. Your API key will be created instantly:
   ```
   Example: AIzaSyD1234567890abcdefghijklmnopqrstuv
   ```

4. **Important**: Click **"Restrict Key"** (security best practice)

5. Under **"API restrictions"**:
   - Select **"Restrict key"**
   - Check **"Custom Search API"**
   - Click **"Save"**

6. **Copy your API key** - you'll need it later!

---

### Step 4: Create a Custom Search Engine

1. Go to **Programmable Search Engine**: https://programmablesearchengine.google.com/

2. Click **"Add"** or **"Get Started"**

3. Fill in the details:
   - **Search engine name**: `Learning Agent Search`
   - **What to search**: Select **"Search the entire web"**
   - **SafeSearch**: Turn **ON** (recommended)

4. Click **"Create"**

5. On the next page, click **"Customize"**

6. In the left sidebar, click **"Setup"** → **"Basic"**

7. **Copy your Search Engine ID**:
   ```
   Example: 0123456789abcdefg:hijklmnopqr
   ```
   - It's shown as **"Search engine ID"** or **"cx"**

---

### Step 5: Add Credentials to Your Project

1. Open your `.env` file in the project root

2. Add these two lines:
   ```bash
   GOOGLE_SEARCH_API_KEY=AIzaSyD1234567890abcdefghijklmnopqrstuv
   GOOGLE_SEARCH_ENGINE_ID=0123456789abcdefg:hijklmnopqr
   ```

3. **Replace** with your actual credentials from Steps 3 and 4

4. Save the file

---

### Step 6: Restart Docker Services

```bash
# Restart to load new environment variables
docker-compose -f docker-compose.dev.yaml restart app

# Or if you prefer a full restart
docker-compose -f docker-compose.dev.yaml down
docker-compose -f docker-compose.dev.yaml up -d
```

---

## ✅ Verify It's Working

1. Visit: http://localhost:3000/agent-playground

2. Ask the agent:
   ```
   "Search for latest AI trends"
   ```

3. You should see **real search results** instead of simulated ones!

4. Check the backend logs:
   ```bash
   docker-compose -f docker-compose.dev.yaml logs app | grep "Google Search"
   ```

   You should see:
   ```
   [Learning Agent] Calling Google Search API
   [Learning Agent] Google Search successful
   ```

---

## 🎯 Test Queries to Try

Once setup is complete, try these:

```
1. "Find the latest article on https://blog.gslin.org/"
2. "Search for React 19 new features"
3. "What are the latest AI developments?"
4. "Find tutorials about TypeScript 5.0"
5. "Search for Vercel AI SDK documentation"
```

---

## 📊 Free Tier Limits

**Google Custom Search API Free Tier:**
- ✅ **100 queries per day** (FREE)
- ⏰ Resets at midnight Pacific Time (PT)
- 📈 More than enough for learning and development

**If you exceed 100 queries:**
- Option 1: Wait until midnight PT for reset
- Option 2: Enable billing ($5 per 1,000 queries)

**To monitor usage:**
1. Go to: https://console.cloud.google.com/apis/api/customsearch.googleapis.com/quotas
2. View **"Queries per day"** quota

---

## 🔧 Troubleshooting

### Issue 1: "API not configured" message

**Symptoms**: Agent says search API is not configured

**Solutions**:
1. Check `.env` file has correct credentials
2. Ensure no extra spaces around `=` sign
3. Restart Docker: `docker-compose restart app`
4. Check logs: `docker logs <container_id>`

---

### Issue 2: "403 Forbidden" error

**Cause**: API key restrictions are too strict

**Solution**:
1. Go to: https://console.cloud.google.com/apis/credentials
2. Click your API key
3. Under "API restrictions", ensure **"Custom Search API"** is checked
4. Under "Application restrictions", try **"None"** for development
5. Click "Save"

---

### Issue 3: "429 Quota exceeded" error

**Cause**: Used more than 100 queries today

**Solutions**:
1. **Wait**: Quota resets at midnight PT
2. **Enable billing**: Add payment method in Google Cloud
3. **Use multiple keys**: Create multiple projects (each gets 100/day)

---

### Issue 4: "Invalid API key" error

**Cause**: Wrong API key or not enabled

**Solution**:
1. Verify API key copied correctly (no spaces)
2. Ensure Custom Search API is **enabled** in your project
3. Try creating a new API key
4. Check API key restrictions are not too strict

---

### Issue 5: No results returned

**Symptoms**: Search returns empty results

**Solution**:
1. Check Search Engine settings at https://programmablesearchengine.google.com/
2. Ensure **"Search the entire web"** is enabled
3. Try different search queries
4. Check logs for specific errors

---

## 💰 Cost Breakdown

### Free Tier (Recommended for learning)
- **Cost**: $0
- **Limit**: 100 queries/day
- **Perfect for**: Development, learning, demos

### Paid Tier (If needed)
- **Cost**: $5 per 1,000 queries ($0.005 per query)
- **Example**: 10,000 queries/month = $50/month
- **When needed**: Production apps with high usage

### Cost Comparison with Other APIs
| Service | Free Tier | Cost After Free |
|---------|-----------|----------------|
| Google Custom Search | 100/day | $5/1K |
| Bing Search | 1,000/month | $3-7/1K |
| Brave Search | 2,000/month | $3/1K |
| SerpAPI | 100/month | $50/month ❌ |

---

## 🛡️ Security Best Practices

### 1. **Restrict Your API Key**
```
✅ DO: Restrict to Custom Search API only
❌ DON'T: Leave unrestricted (anyone can use it)
```

### 2. **Never Commit API Keys**
```bash
# .env is already in .gitignore
# If you accidentally commit:
git rm --cached .env
git commit -m "Remove .env"

# Then rotate your API key:
# Go to console.cloud.google.com → Credentials → Delete old key → Create new
```

### 3. **Monitor Usage**
- Check quota usage regularly
- Set up budget alerts in Google Cloud
- Review API logs for suspicious activity

### 4. **Use Environment Variables**
```bash
# ✅ Good - uses .env
GOOGLE_SEARCH_API_KEY=${GOOGLE_SEARCH_API_KEY}

# ❌ Bad - hardcoded
const apiKey = "AIzaSy..."
```

---

## 🎓 Advanced Configuration

### Search Specific Websites Only

If you want to search only specific domains:

1. Go to: https://programmablesearchengine.google.com/
2. Click your search engine → **"Setup"**
3. Under **"Sites to search"**, change to **"Search only included sites"**
4. Add domains:
   - `blog.gslin.org`
   - `dev.to`
   - `medium.com`
5. Save

Now searches will only return results from these sites!

---

### Enable Image Search

Add to search query parameters:
```typescript
url.searchParams.set('searchType', 'image');
```

---

### Add Site-Specific Search

In the agent query:
```
"Search blog.gslin.org for latest articles"
```

The agent will automatically add `site:blog.gslin.org` to the query.

---

## 📚 Additional Resources

### Official Documentation
- **Custom Search API**: https://developers.google.com/custom-search/v1/overview
- **API Reference**: https://developers.google.com/custom-search/v1/reference/rest/v1/cse/list
- **Pricing**: https://developers.google.com/custom-search/v1/overview#pricing

### Helpful Links
- **Google Cloud Console**: https://console.cloud.google.com/
- **Programmable Search Engine**: https://programmablesearchengine.google.com/
- **API Quotas**: https://console.cloud.google.com/apis/api/customsearch.googleapis.com/quotas
- **Billing**: https://console.cloud.google.com/billing

---

## ✅ Setup Checklist

Before you start using the agent, make sure:

- [ ] Google Cloud Project created
- [ ] Custom Search API enabled
- [ ] API Key created and restricted
- [ ] Custom Search Engine created
- [ ] Search Engine ID copied
- [ ] Both credentials added to `.env`
- [ ] Docker services restarted
- [ ] Test query successful
- [ ] Backend logs show "Google Search successful"

---

## 🎉 You're All Set!

Your learning agent now has **real web search** capabilities!

Try asking:
```
"Find the latest article on https://blog.gslin.org/"
```

The agent will use Google Custom Search API to fetch real, up-to-date search results!

---

**Need help?** Check the troubleshooting section above or review the logs:
```bash
docker-compose -f docker-compose.dev.yaml logs app -f | grep "Learning Agent"
```

**Happy searching! 🔍✨**
