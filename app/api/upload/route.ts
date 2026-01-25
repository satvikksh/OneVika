// export const runtime = "nodejs";

// // Optional: Increase timeout on Vercel (Pro plan required for >10s, max 60s for Hobby)
// export const maxDuration = 60; 

// import { NextResponse } from "next/server";
// import cloudinary from "@/app/lib/cloudinary";

// export async function POST(req: Request) {
//   try {
//     // 1. Check Content-Type
//     const contentType = req.headers.get("content-type") || "";
//     if (!contentType.includes("multipart/form-data")) {
//       return NextResponse.json(
//         { error: "Invalid Content-Type. Must be multipart/form-data" },
//         { status: 400 }
//       );
//     }

//     // 2. Parse Form Data
//     const formData = await req.formData();
//     const file = formData.get("file") as File;

//     if (!file) {
//       return NextResponse.json(
//         { error: "No file found in request" },
//         { status: 400 }
//       );
//     }

//     // 3. File Validation (Optional: Check Size/Type before processing)
//     // Note: Vercel/AWS limits might block the request before it even reaches this line.
//     if (file.size > 50 * 1024 * 1024) {
//        return NextResponse.json({ error: "File too large (>50MB)" }, { status: 400 });
//     }

//     // 4. Convert File to Buffer
//     // Note: We convert to ArrayBuffer then Buffer. This holds the whole file in RAM.
//     const arrayBuffer = await file.arrayBuffer();
//     const buffer = Buffer.from(arrayBuffer);

//     // 5. Upload to Cloudinary
//     const uploadResult = await new Promise((resolve, reject) => {
//       cloudinary.uploader.upload_stream(
//         {
//           folder: "posts",
//           resource_type: "auto", // Automatically detect image/video
//         },
//         (error, result) => {
//           if (error) {
//             console.error("Cloudinary Upload Error:", error);
//             reject(error);
//           } else {
//             resolve(result);
//           }
//         }
//       ).end(buffer);
//     });

//     return NextResponse.json({
//       url: (uploadResult as any).secure_url,
//       type: (uploadResult as any).resource_type,
//     });

//   } catch (error: any) {
//     console.error("SERVER UPLOAD ERROR:", error);
    
//     // Check if it's a specific Cloudinary error
//     return NextResponse.json(
//       { error: error.message || "Internal Server Error during upload" },
//       { status: 500 }
//     );
//   }
// }