import { notFound } from "next/navigation";
import { InvestorDetail } from "./investor-detail";
import { getInvestor } from "@/services/investors.service";

export default async function InvestorDetailPage({ params }: { params: { id: string } }) {
  const investor = await getInvestor(params.id);
  if (!investor) notFound();
  return <InvestorDetail investor={investor} />;
}
