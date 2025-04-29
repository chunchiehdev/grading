interface FeedbackDisplayProps {
  feedback: string;
  onClose: () => void;
}

export function FeedbackDisplay({ feedback, onClose }: FeedbackDisplayProps) {
  return (
    <div className="feedback-display">
      <div className="feedback-content">{feedback}</div>
      <button onClick={onClose}>Close</button>
    </div>
  );
} 