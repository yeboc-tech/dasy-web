import { CircleHelp } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface HelpTooltipProps {
  children: React.ReactNode;
  size?: number;
}

export function HelpTooltip({ children, size = 14 }: HelpTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <CircleHelp
          className="text-gray-400 hover:text-gray-600 transition-colors cursor-help shrink-0"
          style={{ width: size, height: size }}
        />
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={4}
        className="bg-gray-800 text-white text-xs px-3 py-2 rounded-lg shadow-lg max-w-64"
      >
        {children}
      </TooltipContent>
    </Tooltip>
  );
}
