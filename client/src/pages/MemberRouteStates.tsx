import { MemberShell } from "@/components/MemberShell";
import { StatePanel, StateSkeleton } from "@/components/StatePanel";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { MessagesPage, NotificationsPage, ProfilePage } from "./MemberPages";
import ConnectionsPage from "./ConnectionsPage";
import MemberDashboardPage from "./MemberDashboardPage";

function ProfileGate({ eyebrow, title, description, loadingLabel, children }: { eyebrow: string; title: string; description: string; loadingLabel: string; children: React.ReactNode }) {
  const profile = trpc.profile.mine.useQuery();
  if (profile.isLoading) return <MemberShell eyebrow={eyebrow} title={title} description={description}><StateSkeleton label={loadingLabel} /></MemberShell>;
  if (profile.isError) return <MemberShell eyebrow={eyebrow} title={title} description={description}><StatePanel kind="error" title="This protected area is unavailable right now." description="No profile, privacy, or relationship state has been changed. Please try again." action={<Button onClick={() => profile.refetch()} className="btn-forest">Try again</Button>} /></MemberShell>;
  return <>{children}</>;
}

export function MemberHomeRoute() { return <ProfileGate eyebrow="Your Bantaba" title="Your private command center." description="Review your current account status and the actions that need your attention without changing any state automatically." loadingLabel="Loading your protected command center…"><MemberDashboardPage /></ProfileGate>; }

export function MemberProfileRoute() { return <ProfileGate eyebrow="My profile" title="Your introduction, in your control." description="Review the information members may see and the privacy choices that protect your pace." loadingLabel="Loading your profile overview…"><ProfilePage /></ProfileGate>; }

export function MemberMatchesRoute() { return <ConnectionsPage />; }

export function MemberMessagesRoute() {
  return <ProfileGate eyebrow="Messages" title="Private conversations, earned mutually." description="Conversation access is limited to active mutual matches. Report and block controls stay available throughout." loadingLabel="Loading your protected message space…"><MessagesPage /></ProfileGate>;
}

export function MemberNotificationsRoute() {
  const notifications = trpc.notifications.list.useQuery();
  const preferences = trpc.notifications.preferences.useQuery();
  if (notifications.isLoading || preferences.isLoading) return <MemberShell eyebrow="Notifications" title="Updates, on your terms." description="In-app updates remain your private source of truth."><StateSkeleton label="Loading your notification center and preferences…" /></MemberShell>;
  if (notifications.isError || preferences.isError) return <MemberShell eyebrow="Notifications" title="Updates, on your terms." description="In-app updates remain your private source of truth."><StatePanel kind="error" title="Your notification center is unavailable right now." description="No notification or delivery preference details have been shown. Please try again." action={<Button onClick={() => { void notifications.refetch(); void preferences.refetch(); }} className="btn-forest">Try again</Button>} /></MemberShell>;
  return <NotificationsPage />;
}
