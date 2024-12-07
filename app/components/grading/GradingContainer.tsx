// app/components/grading/GradingContainer.tsx
import type { FeedbackData } from "~/types/grading";
import { GradingStepper } from "./GradingStepper";
import { AssignmentInput } from "./AssignmentInput";
import { GradingProgress } from "./GradingProgress";
import { FeedbackDisplay } from "./FeedbackDisplay";
import { StatusSnackbar } from "./StatusSnackbar";
import { useState } from "react";

interface GradingContainerProps {
  isGrading: boolean;
  feedback?: FeedbackData;
  error?: string;
}

export function GradingContainer({ 
  isGrading, 
  feedback, 
  error 
}: GradingContainerProps) {
  const [snackbar, setSnackbar] = useState({
    open: Boolean(error),
    message: error || "",
    severity: error ? "error" as const : "success" as const,
  });
  const activeStep = isGrading ? 1 : feedback ? 2 : 0;

  return (
    <div className="container mx-auto px-4 max-w-7xl">
      <div className="flex flex-col space-y-6">
        <GradingStepper activeStep={activeStep} />
        
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-grow-0 md:flex-grow md:w-2/3">
            <AssignmentInput disabled={isGrading}/>
          </div>
          
          <div className="flex-grow-0 md:flex-grow md:w-1/3">
            {isGrading ? (
              <div className="bg-white rounded-lg shadow-lg">
                <GradingProgress />
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-lg">
                <FeedbackDisplay feedback={feedback} />
              </div>
            )}
          </div>
        </div>

        <StatusSnackbar
          open={snackbar.open}
          message={snackbar.message}
          severity={snackbar.severity}
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        />
      </div>
    </div>
  );
}