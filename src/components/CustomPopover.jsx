import { cloneElement, isValidElement, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export default function CustomPopover({
  trigger,
  title,
  content,
  side,
  align,
  className = "custom-popover-content",
}) {
  const [open, setOpen] = useState(false);
  const triggerNode = isValidElement(trigger)
    ? cloneElement(trigger, {
        className: cn(trigger.props.className, "cursor-pointer"),
      })
    : trigger;

  return (
    <Popover open={open} onOpenChange={setOpen} className="popover-custom">
      <PopoverTrigger
        asChild
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        {triggerNode}
      </PopoverTrigger>

      <PopoverContent
        side={side}
        align={align}
        className={`w-[320px] text-sm ${className}`}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        {title ? (
          <p className="text-[17px] font-semibold text-slate-900">{title}</p>
        ) : null}
        {content ? (
          <p className="text-[15px] text-slate-600 leading-tight mt-1">
            {content}
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
