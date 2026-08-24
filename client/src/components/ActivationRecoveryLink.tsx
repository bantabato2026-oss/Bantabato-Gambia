import { getActivationJourneyAction, type ActivationEligibility } from "@/lib/activationJourney";
import { ChevronRight } from "lucide-react";
import { Link } from "wouter";

export function ActivationRecoveryLink({ eligibility, className = "" }: { eligibility?: ActivationEligibility | null; className?: string }) {
  const action = getActivationJourneyAction(eligibility);
  return <Link href={action.href} className={`inline-flex items-center gap-2 text-sm font-semibold text-forest ${className}`}>{action.label}<ChevronRight size={16} /></Link>;
}
