import { MemberShell } from "@/components/MemberShell";
import { StatePanel, StateSkeleton } from "@/components/StatePanel";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { MatchesPage, MemberHomePage, MessagesPage, NotificationsPage, ProfilePage } from "./MemberPages";

function ProfileGate({ eyebrow, title, description, loadingLabel, children }: { eyebrow: string; title: string; description: string; loadingLabel: string; children: React.ReactNode }) {
  const profile = trpc.profile.mine.useQuery();
  if (profile.isLoading) return <MemberShell eyebrow={eyebrow} title={title} description={description}><StateSkeleton label={loadingLabel} /></MemberShell>;
  if (profile.isError) return <MemberShell eyebrow={eyebrow} title={title} description={description}><StatePanel kind="error" title="This protected area is unavailable right now." description="No profile, privacy, or relationship state has been changed. Please try again." action={<Button onClick={() => profile.refetch()} className="btn-forest">Try again</Button>} /></MemberShell>;
  return <>{children}</>;
}

export function MemberHomeRoute() { return <ProfileGate eyebrow="Your Bantaba" title="A meaningful start." description="Build your profile with care, then discover members at a pace that feels right for you." loadingLabel="Loading your protected start…"><MemberHomePage /></ProfileGate>; }

export function MemberProfileRoute() { return <ProfileGate eyebrow="My profile" title="Your introduction, in your control." description="Review the information members may see and the privacy choices that protect your pace." loadingLabel="Loading your profile overview…"><ProfilePage /></ProfileGate>; }

export function MemberMatchesRoute() {
  const incoming = trpc.interests.incoming.useQuery();
  const matches = trpc.matches.list.useQuery();
  if (incoming.isLoading || matches.isLoading) return <MemberShell eyebrow="Introductions" title="Mutual interest opens the door." description="A one-sided request never opens a conversation. Both people choose when an introduction becomes a match."><StateSkeleton label="Loading your private introductions…" /></MemberShell>;
  if (incoming.isError || matches.isError) return <MemberShell eyebrow="Introductions" title="Mutual interest opens the door." description="A one-sided request never opens a conversation. Both people choose when an introduction becomes a match."><StatePanel kind="error" title="Your introductions are unavailable right now." description="No interest or match state has been changed. Please try again." action={<Button onClick={() => { void incoming.refetch(); void matches.refetch(); }} className="btn-forest">Try again</Button>} /></MemberShell>;
  return <MatchesPage />;
}

export function MemberMessagesRoute() {
  const conversations = trpc.messaging.conversations.useQuery();
  if (conversations.isLoading) return <MemberShell eyebrow="Messages" title="Private conversations, earned mutually." description="Conversation access is limited to active mutual matches. Report and block controls stay available throughout."><StateSkeleton label="Loading your private conversations…" /></MemberShell>;
  if (conversations.isError) return <MemberShell eyebrow="Messages" title="Private conversations, earned mutually." description="Conversation access is limited to active mutual matches. Report and block controls stay available throughout."><StatePanel kind="error" title="Your conversations are unavailable right now." description="No conversation, block, report, or read state has been changed. Please try again." action={<Button onClick={() => conversations.refetch()} className="btn-forest">Try again</Button>} /></MemberShell>;
  return <MessagesPage />;
}

export function MemberNotificationsRoute() {
  const notifications = trpc.notifications.list.useQuery();
  const preferences = trpc.notifications.preferences.useQuery();
  if (notifications.isLoading || preferences.isLoading) return <MemberShell eyebrow="Notifications" title="Updates, on your terms." description="In-app updates remain your private source of truth."><StateSkeleton label="Loading your notification center and preferences…" /></MemberShell>;
  if (notifications.isError || preferences.isError) return <MemberShell eyebrow="Notifications" title="Updates, on your terms." description="In-app updates remain your private source of truth."><StatePanel kind="error" title="Your notification center is unavailable right now." description="No notification or delivery preference details have been shown. Please try again." action={<Button onClick={() => { void notifications.refetch(); void preferences.refetch(); }} className="btn-forest">Try again</Button>} /></MemberShell>;
  return <NotificationsPage />;
}
