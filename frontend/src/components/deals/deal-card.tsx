"use client";

import { User, Calendar, DollarSign, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Deal } from "@/lib/types/deals";

interface DealCardProps {
  deal: Deal;
  onClick: () => void;
}

export function DealCard({ deal, onClick }: DealCardProps) {
  const formatValue = (val: number | null, currency: string) => {
    if (val === null) return null;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl bg-surface-container-lowest border border-outline-variant/10 p-3.5 hover:border-primary/20 hover:shadow-sm transition-all group"
    >
      <p className="text-[13px] font-semibold text-on-surface truncate group-hover:text-primary transition-colors">
        {deal.title}
      </p>

      <p className="text-[12px] text-on-surface-variant mt-1 truncate">
        {deal.contact.name || deal.contact.phoneNumber}
      </p>

      <div className="flex items-center gap-2 mt-2.5 flex-wrap">
        {deal.value !== null && (
          <Badge variant="primary" className="text-[10px]">
            <DollarSign className="h-3 w-3 mr-0.5" />
            {formatValue(deal.value, deal.currency)}
          </Badge>
        )}
        {deal.expectedClose && (
          <Badge variant="muted" className="text-[10px]">
            <Calendar className="h-3 w-3 mr-0.5" />
            {new Date(deal.expectedClose).toLocaleDateString("en-IN", {
              month: "short",
              day: "numeric",
            })}
          </Badge>
        )}
        {deal.product && (
          <Badge variant="info" className="text-[10px]">
            <Package className="h-3 w-3 mr-0.5" />
            {deal.product.name}
          </Badge>
        )}
        {deal.assignedTo && (
          <Badge variant="default" className="text-[10px]">
            <User className="h-3 w-3 mr-0.5" />
            {deal.assignedTo.firstName}
          </Badge>
        )}
      </div>
    </button>
  );
}
