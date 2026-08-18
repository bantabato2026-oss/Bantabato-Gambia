import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import { ContactPage, FAQPage, MembershipPage, PublicInfoPage, SignInPage } from "@/pages/PublicPages";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { BrandedRouteLoading, PageEnter } from "./components/ExperienceMotion";
import { ThemeProvider } from "./contexts/ThemeContext";
import { lazy, Suspense } from "react";
import { useLocation } from "wouter";

const AdminPage = lazy(() => import("@/pages/AdminPage"));
const AdminVerificationQueuePage = lazy(() => import("@/pages/AdminOperations").then(module => ({ default: module.AdminVerificationQueuePage })));
const AdminVerificationCasePage = lazy(() => import("@/pages/AdminOperations").then(module => ({ default: module.AdminVerificationCasePage })));
const AdminReportsQueuePage = lazy(() => import("@/pages/AdminOperations").then(module => ({ default: module.AdminReportsQueuePage })));
const AdminReportCasePage = lazy(() => import("@/pages/AdminOperations").then(module => ({ default: module.AdminReportCasePage })));
const AdminConnectionReviewsPage = lazy(() => import("@/pages/AdminConnectionReviews"));
const AdminFamilyCirclePage = lazy(() => import("@/pages/AdminFamilyCircle"));
const MemberProfileDetailPage = lazy(() => import("@/pages/MemberDetailPages").then(module => ({ default: module.MemberProfileDetailPage })));
const MessageThreadPage = lazy(() => import("@/pages/MemberDetailPages").then(module => ({ default: module.MessageThreadPage })));
const FamilyCirclePage = lazy(() => import("@/pages/FamilyCirclePages").then(module => ({ default: module.FamilyCirclePage })));
const FamilyParticipantPage = lazy(() => import("@/pages/FamilyCirclePages").then(module => ({ default: module.FamilyParticipantPage })));
const MemberHomePage = lazy(() => import("@/pages/MemberPages").then(module => ({ default: module.MemberHomePage })));
const OnboardingPage = lazy(() => import("@/pages/MemberPages").then(module => ({ default: module.OnboardingPage })));
const ProfilePage = lazy(() => import("@/pages/MemberPages").then(module => ({ default: module.ProfilePage })));
const FamilyPage = lazy(() => import("@/pages/MemberPages").then(module => ({ default: module.FamilyPage })));
const MatchesPage = lazy(() => import("@/pages/MemberPages").then(module => ({ default: module.MatchesPage })));
const MessagesPage = lazy(() => import("@/pages/MemberPages").then(module => ({ default: module.MessagesPage })));
const NotificationsPage = lazy(() => import("@/pages/MemberPages").then(module => ({ default: module.NotificationsPage })));
const SettingsPage = lazy(() => import("@/pages/MemberPages").then(module => ({ default: module.SettingsPage })));
const CuratedDiscoveryPage = lazy(() => import("@/pages/CuratedDiscoveryPage"));
const ProfileMediaPage = lazy(() => import("@/pages/ProfileMediaPage"));
const VerificationCenter = lazy(() => import("@/pages/VerificationCenter"));
const CompatibilityPreferencesPage = lazy(() => import("@/pages/CompatibilityPreferencesPage"));
const ProfileDetailsPage = lazy(() => import("@/pages/ProfileDetailsPage"));
const RecommendationsPage = lazy(() => import("@/pages/RecommendationsPage"));
const BillingPage = lazy(() => import("@/pages/BillingPage"));
const SafetyCenterPage = lazy(() => import("@/pages/SafetyCenterPage"));
const InternationalPage = lazy(() => import("./pages/InternationalPage"));
const DeviceExperiencePage = lazy(() => import("./pages/DeviceExperiencePage").then(module => ({ default: module.DeviceExperiencePage })));
const AdminRecommendationPolicyPage = lazy(() => import("@/pages/AdminRecommendationPolicy"));
const AdminBillingPage = lazy(() => import("@/pages/AdminBilling"));
const AdminNotificationsPage = lazy(() => import("@/pages/AdminNotifications"));
const AdminSafetyOperationsPage = lazy(() => import("@/pages/AdminSafetyOperations"));
const AdminSupportPage = lazy(() => import("@/pages/AdminSupport"));
const AdminApprovalsPage = lazy(() => import("@/pages/AdminOperationalQueues").then(module => ({ default: module.AdminApprovalsPage })));
const AdminIncidentsPage = lazy(() => import("@/pages/AdminOperationalQueues").then(module => ({ default: module.AdminIncidentsPage })));
const AdminAuditPage = lazy(() => import("@/pages/AdminOperationsManagement").then(module => ({ default: module.AdminAuditPage })));
const AdminConfigurationPage = lazy(() => import("@/pages/AdminOperationsManagement").then(module => ({ default: module.AdminConfigurationPage })));
const AdminMembersPage = lazy(() => import("@/pages/AdminOperationsManagement").then(module => ({ default: module.AdminMembersPage })));
const AdminStaffPage = lazy(() => import("@/pages/AdminOperationsManagement").then(module => ({ default: module.AdminStaffPage })));
const AdminCountriesPage = lazy(() => import("@/pages/AdminCountries"));
const BetaAccessPage = lazy(() => import("@/pages/BetaAccessPage"));
const AdminBetaPage = lazy(() => import("@/pages/AdminBetaPage"));

function Router() {
  const [location] = useLocation();
  return <PageEnter key={location}><Switch>
    <Route path="/" component={Home} />
    <Route path="/about">{() => <PublicInfoPage page="about" />}</Route>
    <Route path="/how-it-works">{() => <PublicInfoPage page="how-it-works" />}</Route>
    <Route path="/safety">{() => <PublicInfoPage page="safety" />}</Route>
    <Route path="/privacy">{() => <PublicInfoPage page="privacy" />}</Route>
    <Route path="/terms">{() => <PublicInfoPage page="terms" />}</Route>
    <Route path="/contact" component={ContactPage} />
    <Route path="/faq" component={FAQPage} />
    <Route path="/membership" component={MembershipPage} />
    <Route path="/login">{() => <SignInPage />}</Route>
    <Route path="/register">{() => <SignInPage registration />}</Route>
    <Route path="/beta" component={BetaAccessPage} />
    <Route path="/app" component={MemberHomePage} />
    <Route path="/app/onboarding" component={OnboardingPage} />
    <Route path="/app/profile" component={ProfilePage} />
    <Route path="/app/profile/details" component={ProfileDetailsPage} />
	    <Route path="/app/compatibility" component={CompatibilityPreferencesPage} />
		<Route path="/app/international" component={InternationalPage} />
		<Route path="/app/device" component={DeviceExperiencePage} />
    <Route path="/app/profile/:profileId">{params => <MemberProfileDetailPage profileId={Number(params.profileId)} />}</Route>
    <Route path="/app/photos" component={ProfileMediaPage} />
    <Route path="/app/discover" component={CuratedDiscoveryPage} />
	    <Route path="/app/recommendations" component={RecommendationsPage} />
	    <Route path="/app/billing" component={BillingPage} />
    <Route path="/app/matches" component={MatchesPage} />
    <Route path="/app/messages" component={MessagesPage} />
    <Route path="/app/messages/:conversationId">{params => <MessageThreadPage conversationId={Number(params.conversationId)} />}</Route>
	    <Route path="/app/family" component={FamilyCirclePage} />
	    <Route path="/family" component={FamilyParticipantPage} />
    <Route path="/app/verification" component={VerificationCenter} />
    <Route path="/app/settings" component={SettingsPage} />
	    <Route path="/app/notifications" component={NotificationsPage} />
	    <Route path="/app/safety" component={SafetyCenterPage} />
    <Route path="/admin" component={AdminPage} />
    <Route path="/admin/verification" component={AdminVerificationQueuePage} />
    <Route path="/admin/verification/:caseId">{params => <AdminVerificationCasePage caseId={Number(params.caseId)} />}</Route>
    <Route path="/admin/reports" component={AdminReportsQueuePage} />
    <Route path="/admin/reports/:caseId">{params => <AdminReportCasePage caseId={Number(params.caseId)} />}</Route>
	    <Route path="/admin/connections" component={AdminConnectionReviewsPage} />
	    <Route path="/admin/family" component={AdminFamilyCirclePage} />
	    <Route path="/admin/recommendations" component={AdminRecommendationPolicyPage} />
      <Route path="/admin/billing" component={AdminBillingPage} />
	      <Route path="/admin/notifications" component={AdminNotificationsPage} />
	      <Route path="/admin/safety" component={AdminSafetyOperationsPage} />
	      <Route path="/admin/members" component={AdminMembersPage} />
	      <Route path="/admin/support" component={AdminSupportPage} />
	      <Route path="/admin/approvals" component={AdminApprovalsPage} />
	      <Route path="/admin/incidents" component={AdminIncidentsPage} />
	      <Route path="/admin/staff" component={AdminStaffPage} />
	      <Route path="/admin/audit" component={AdminAuditPage} />
	      <Route path="/admin/configuration" component={AdminConfigurationPage} />
	      <Route path="/admin/beta" component={AdminBetaPage} />
	      <Route path="/admin/countries" component={AdminCountriesPage} />
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch></PageEnter>;
}

export default function App() { return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Suspense fallback={<BrandedRouteLoading />}><Router /></Suspense></TooltipProvider></ThemeProvider></ErrorBoundary>; }
