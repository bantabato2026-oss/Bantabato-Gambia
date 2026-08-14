import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import AdminPage from "@/pages/AdminPage";
import { AdminReportCasePage, AdminReportsQueuePage, AdminVerificationCasePage, AdminVerificationQueuePage } from "@/pages/AdminOperations";
import AdminConnectionReviewsPage from "@/pages/AdminConnectionReviews";
import AdminFamilyCirclePage from "@/pages/AdminFamilyCircle";
import Home from "@/pages/Home";
import { ContactPage, FAQPage, PublicInfoPage, SignInPage } from "@/pages/PublicPages";
import { MemberProfileDetailPage, MessageThreadPage } from "@/pages/MemberDetailPages";
import { FamilyCirclePage, FamilyParticipantPage } from "@/pages/FamilyCirclePages";
import { FamilyPage, MatchesPage, MemberHomePage, MessagesPage, NotificationsPage, OnboardingPage, ProfilePage, SettingsPage } from "@/pages/MemberPages";
import CuratedDiscoveryPage from "@/pages/CuratedDiscoveryPage";
import NotFound from "@/pages/NotFound";
import ProfileMediaPage from "@/pages/ProfileMediaPage";
import VerificationCenter from "@/pages/VerificationCenter";
import CompatibilityPreferencesPage from "@/pages/CompatibilityPreferencesPage";
import ProfileDetailsPage from "@/pages/ProfileDetailsPage";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

function Router() {
  return <Switch>
    <Route path="/" component={Home} />
    <Route path="/about">{() => <PublicInfoPage page="about" />}</Route>
    <Route path="/how-it-works">{() => <PublicInfoPage page="how-it-works" />}</Route>
    <Route path="/safety">{() => <PublicInfoPage page="safety" />}</Route>
    <Route path="/privacy">{() => <PublicInfoPage page="privacy" />}</Route>
    <Route path="/terms">{() => <PublicInfoPage page="terms" />}</Route>
    <Route path="/contact" component={ContactPage} />
    <Route path="/faq" component={FAQPage} />
    <Route path="/login">{() => <SignInPage />}</Route>
    <Route path="/register">{() => <SignInPage registration />}</Route>
    <Route path="/app" component={MemberHomePage} />
    <Route path="/app/onboarding" component={OnboardingPage} />
    <Route path="/app/profile" component={ProfilePage} />
    <Route path="/app/profile/details" component={ProfileDetailsPage} />
    <Route path="/app/compatibility" component={CompatibilityPreferencesPage} />
    <Route path="/app/profile/:profileId">{params => <MemberProfileDetailPage profileId={Number(params.profileId)} />}</Route>
    <Route path="/app/photos" component={ProfileMediaPage} />
    <Route path="/app/discover" component={CuratedDiscoveryPage} />
    <Route path="/app/matches" component={MatchesPage} />
    <Route path="/app/messages" component={MessagesPage} />
    <Route path="/app/messages/:conversationId">{params => <MessageThreadPage conversationId={Number(params.conversationId)} />}</Route>
	    <Route path="/app/family" component={FamilyCirclePage} />
	    <Route path="/family" component={FamilyParticipantPage} />
    <Route path="/app/verification" component={VerificationCenter} />
    <Route path="/app/settings" component={SettingsPage} />
    <Route path="/app/notifications" component={NotificationsPage} />
    <Route path="/admin" component={AdminPage} />
    <Route path="/admin/verification" component={AdminVerificationQueuePage} />
    <Route path="/admin/verification/:caseId">{params => <AdminVerificationCasePage caseId={Number(params.caseId)} />}</Route>
    <Route path="/admin/reports" component={AdminReportsQueuePage} />
    <Route path="/admin/reports/:caseId">{params => <AdminReportCasePage caseId={Number(params.caseId)} />}</Route>
	    <Route path="/admin/connections" component={AdminConnectionReviewsPage} />
	    <Route path="/admin/family" component={AdminFamilyCirclePage} />
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch>;
}

export default function App() { return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>; }
