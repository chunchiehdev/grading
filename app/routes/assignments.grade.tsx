import { type ActionFunctionArgs } from "@remix-run/node";
import { useActionData, useNavigation } from "@remix-run/react";
import { GradingContainer } from "~/components/grading/GradingContainer";
import { gradeAssignment } from "~/services/grading.server";
import { validateAssignment } from "~/utils/validation";
import type { FeedbackData } from "~/types/grading";

interface ActionErrorData {
  error: string;
  feedback?: never;
}

interface ActionSuccessData {
  feedback: FeedbackData;
  error?: never;
}

type ActionData = ActionErrorData | ActionSuccessData;

export async function action({ request }: ActionFunctionArgs): Promise<ActionData> {
  const formData = await request.formData();
  const content = formData.get("content") as string;
  const validationResult = validateAssignment(content);
  console.log(content)

  if (!validationResult.isValid) {
  
    return {
      error: `作業缺少必要的部分：${validationResult.missingParts.join("、")}`,
    };
  }
  console.log(content)

  try {
    const feedback = await gradeAssignment(content);
    // 直接返回成功物件
    return { feedback };
  } catch (error) {
    // 直接返回錯誤物件
    return { error: "評分過程發生錯誤" };
  }
}

export default function AssignmentGradingPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  const isGrading = navigation.state === "submitting";

  const feedback = actionData && 'feedback' in actionData ? actionData.feedback : undefined;
  const error = actionData && 'error' in actionData ? actionData.error : undefined;
  return (
    <GradingContainer
      isGrading={isGrading}
      feedback={feedback}
      error={error}
    />
  );
}