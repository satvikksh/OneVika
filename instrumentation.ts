export async function register() {
  if (process.env.NEXT_RUNTIME && process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  try {
    const [{ dbConnect }, { ensureConfiguredAdminAccount }] = await Promise.all([
      import("@/app/lib/mongodb"),
      import("@/app/lib/adminAuth"),
    ]);

    await dbConnect();
    await ensureConfiguredAdminAccount();
  } catch (error) {
    console.error(
      "[ADMIN AUTH DEBUG] Startup admin ensure skipped:",
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}
