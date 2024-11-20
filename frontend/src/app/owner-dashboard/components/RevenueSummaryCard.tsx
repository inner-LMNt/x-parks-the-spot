'use client';

import React from "react";
import { LucideIcon } from "lucide-react";

interface SummaryCardProps {
    label: string;
    value: string | number;
    Icon: LucideIcon;
    iconColor: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ label, value, Icon, iconColor }) => {
    return (
        <div className="flex items-center space-x-2">
            <Icon className={`h-6 w-6 ${iconColor}`} aria-hidden="true" />
            <div>
                <div className="text-xs text-gray-500">{label}</div>
                <div className="text-lg font-semibold">{value}</div>
            </div>
        </div>
    );
};

export default SummaryCard;

