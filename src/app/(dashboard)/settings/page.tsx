import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { verifyAccessToken } from "@/lib/auth";
import SettingsPageContent from "@/components/profile/SettingsPageContent";

const LOGIN_PATH = "/login";
const DASHBOARD_SETTINGS_PATH = "/settings";

async function getUserHasPassword(): Promise<boolean | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) return null;

  try {
    const payload = verifyAccessToken(token);
    await connectDB();

    const user = await User.findById(payload.userId)
      .select("passwordHash")
      .lean();

    if (!user) return null;

    return Boolean(user.passwordHash);
  } catch {
    return null;
  }
}

export default async function SettingsPage() {
  const hasPassword = await getUserHasPassword();

  if (hasPassword === null) {
    redirect(`${LOGIN_PATH}?redirect=${encodeURIComponent(DASHBOARD_SETTINGS_PATH)}`);
  }

  return (
    <SettingsPageContent
      hasPassword={hasPassword}
    />
  );
}
