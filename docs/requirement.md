Add the user's functionality to manage scoring criteria and integrate it into the complete requirements as follows:

---

# Project Requirements Description

## User Flow

1. **Google Login**

   * Users must log in to the system using their Google account.

2. **File Upload**

   * Users can upload one or multiple files.
   * A real-time progress bar must be displayed during the upload process.

     * Use **Server-Sent Events (SSE)** to synchronize upload progress between the server and the frontend.

3. **Select Scoring Criteria**

   * Each uploaded file must be paired with a selected scoring criterion (e.g., chosen from a dropdown menu).

4. **Manage Scoring Criteria**

   * Users can add, edit, or delete scoring criteria.

     * **Add**: Define custom criterion name and description.
     * **Edit**: Update the name and content of existing criteria.
     * **Delete**: Remove unnecessary criteria.
   * All changes should immediately reflect in the frontend selection list.

5. **Submit Scoring Request**

   * Files and their corresponding scoring criteria are submitted to a **large language model** for analysis and scoring.

6. **Result Display**

   * Each file corresponds to one scoring result.
   * For example, if two files are uploaded, two scoring results will be displayed.

## Frontend Display (Using shadcn UI)

* Scoring results are displayed as a Carousel component.

```tsx
import * as React from "react"

import { Card, CardContent } from "@/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"

export function ResultCarousel({ results }: { results: { title: string; score: string }[] }) {
  return (
    <Carousel className="w-full max-w-xl">
      <CarouselContent>
        {results.map((result, index) => (
          <CarouselItem key={index}>
            <div className="p-4">
              <Card>
                <CardContent className="p-6 space-y-4">
                  <h2 className="text-xl font-bold">{result.title}</h2>
                  <p className="text-lg">{result.score}</p>
                </CardContent>
              </Card>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  )
}
```

## Notes

* The CRUD functionality for scoring criteria is recommended to be managed using a Modal or a dedicated page section.
* Upload progress should be transmitted using SSE.
* Users must complete the pairing of files and criteria before submission.

---