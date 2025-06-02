// import { json, type ActionFunctionArgs } from "@remix-run/node";
// import { getGeminiTesting } from "@/services/gemini-testing.server";

// export async function action({ request }: ActionFunctionArgs) {
//     try {
//         const geminiTesting = getGeminiTesting();
//         const formData = await request.formData();
//         const testType = formData.get("testType") as string;

//         switch (testType) {
//             case "connection":
//                 const connectionResult = await geminiTesting.testConnection();
//                 return json(connectionResult);

//             case "modelLimits":
//                 const limitsResult = await geminiTesting.getModelLimits();
//                 return json(limitsResult);

//             case "tokenCount":
//                 const text = formData.get("text") as string;
//                 if (!text) {
//                     return json({ error: "Text is required for token counting" }, { status: 400 });
//                 }
//                 const tokenResult = await geminiTesting.countTokens(text);
//                 return json(tokenResult);

//             case "promptAnalysis":
//                 const criteria = JSON.parse(formData.get("criteria") as string || "[]");
//                 const fileName = formData.get("fileName") as string || "test.txt";
//                 const rubricName = formData.get("rubricName") as string || "Test Rubric";
//                 const mimeType = formData.get("mimeType") as string || "text/plain";

//                 const mockRequest = {
//                     criteria,
//                     fileName,
//                     rubricName,
//                     fileBuffer: Buffer.from("mock content"),
//                     mimeType
//                 };

//                 const analysisResult = await geminiTesting.analyzePromptTokenUsage(mockRequest);
//                 return json(analysisResult);

//             default:
//                 return json({ error: "Invalid test type" }, { status: 400 });
//         }
//     } catch (error) {
//         console.error("Gemini test error:", error);
//         return json(
//             { error: error instanceof Error ? error.message : "Unknown error occurred" },
//             { status: 500 }
//         );
//     }
// } 