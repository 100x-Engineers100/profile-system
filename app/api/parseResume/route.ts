// import { NextRequest, NextResponse } from "next/server";
// import { supabase } from "@/lib/supabase";
// // import { ResumeParser } from "@/app/api/parseResume/resumeParser";

// // const resumeParser = new ResumeParser();

// export async function POST(req: NextRequest) {
//   try {
//     // Fetch all profiles
//     const { data: profiles, error: fetchAllError } = await supabase
//       .from("profiles")
//       .select("id, resume, resume_content");

//     if (fetchAllError) {
//       console.error("Error fetching all profiles:", fetchAllError);
//       return NextResponse.json(
//         { error: "Error fetching all profiles" },
//         { status: 500 }
//       );
//     }

//     const results = [] as any[];
//     let processedCount = 0;

//     for (const profile of profiles) {
//       if (processedCount >= 10) {
//         break;
//       }
//       const { id: profileId, resume: googleDriveUrl, resume_content } = profile;

//       if (resume_content) {
//         results.push({
//           profileId,
//           status: "skipped",
//           message: "Resume content already exists",
//         });
//         continue;
//       }

//       if (!googleDriveUrl) {
//         results.push({
//           profileId,
//           status: "skipped",
//           message: "Google Drive resume URL not found",
//         });
//         continue;
//       }

//       // if (!googleDriveUrl.includes("drive.google.com")) {
//       //   results.push({
//       //     profileId,
//       //     status: "skipped",
//       //     message: "Resume URL is not a Google Drive link",
//       //   });
//       //   continue;
//       // }
//       processedCount++;

//       try {
//         // const parsedResume = await resumeParser.parseResumeFromUrl(
//         //   googleDriveUrl
//         // );

//         // if (!parsedResume || !parsedResume[0].text) {
//         //   results.push({
//         //     profileId,
//         //     status: "failed",
//         //     message: "Failed to parse PDF content or content is empty",
//         //   });
//         //   continue;
//         // }

//         // const { error: updateError } = await supabase
//         //   .from("profiles")
//         //   .update({ resume_content: parsedResume[0].text })
//         //   .eq("id", profileId);

//         // if (updateError) {
//         //   console.error(
//         //     `Error updating profile ${profileId} with resume content:`,
//         //     updateError
//         //   );
//           results.push({
//             profileId,
//             status: "failed",
//             message: "Error updating profile with resume content",
//           });
//           continue;
//         }

//       //   results.push({
//       //     profileId,
//       //     status: "success",
//       //     message: "Resume parsed and stored successfully",
//       //   });
//       // } catch (parseError: any) {
//       //   console.error(
//       //     `Error processing resume for profile ${profileId}:`,
//       //     parseError
//       //   );
//       //   results.push({
//       //     profileId,
//       //     status: "failed",
//       //     message: `Error processing resume: ${parseError.message}`,
//       //   });
//       // }
//     // }

// //     return NextResponse.json(
// //       { message: "Resume parsing process completed", results },
// //       { status: 200 }
// //     );
// //   } catch (error: any) {
// //     console.error("API Error:", error);
// //     return NextResponse.json(
// //       { error: error.message || "Internal Server Error" },
// //       { status: 500 }
// //     );
// //   }
// // }
