/**
 * @file alert-dialog.tsx
 * @purpose Alert dialog components built on Radix UI primitives for confirmations and important messages
 * @created 2025-01-15
 * @modified 2025-08-05
 */

import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";

/**
 * Root alert dialog component that manages dialog state and accessibility.
 * Based on Radix UI AlertDialog.Root with built-in focus management.
 */
const AlertDialog = AlertDialogPrimitive.Root;

/**
 * Trigger component that opens the alert dialog when clicked.
 * Based on Radix UI AlertDialog.Trigger with proper ARIA attributes.
 */
const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

/**
 * Portal component that renders dialog content in a separate DOM tree.
 * Based on Radix UI AlertDialog.Portal for proper layering and accessibility.
 */
const AlertDialogPortal = AlertDialogPrimitive.Portal;

/**
 * Props interface for AlertDialogOverlay component
 * @interface AlertDialogOverlayProps
 */
interface AlertDialogOverlayProps extends React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay> {
  /** Additional CSS classes to apply to the overlay */
  className?: string;
}

/**
 * Overlay component that provides a semi-transparent backdrop behind the dialog.
 * 
 * Features:
 * - Fixed positioning covering entire viewport
 * - Semi-transparent black background with blur effect
 * - Smooth fade animations for open/close states
 * - High z-index for proper layering
 * - Prevents interaction with background content
 * 
 * @component
 */
const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  AlertDialogOverlayProps
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    className={`fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0`}
    {...props}
    ref={ref} />
));
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName;

/**
 * Props interface for AlertDialogContent component
 * @interface AlertDialogContentProps
 */
interface AlertDialogContentProps extends React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content> {
  /** Additional CSS classes to apply to the content container */
  className?: string;
}

/**
 * Main content container for the alert dialog.
 * 
 * Features:
 * - Centered positioning in viewport
 * - White background with shadow and border
 * - Responsive design (rounded corners on larger screens)
 * - Smooth zoom and slide animations
 * - Grid layout for content organization
 * - Maximum width constraint for readability
 * - Includes overlay automatically
 * 
 * @component
 */
const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  AlertDialogContentProps
>(({ className, ...props }, ref) => (
  <AlertDialogPortal>
    <AlertDialogOverlay />
    <AlertDialogPrimitive.Content
      ref={ref}
      className={`fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-white p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg`}
      {...props} />
  </AlertDialogPortal>
));
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName;

/**
 * Props interface for AlertDialogHeader component
 * @interface AlertDialogHeaderProps
 */
interface AlertDialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Additional CSS classes to apply to the header */
  className?: string;
}

/**
 * Header section for the alert dialog containing title and description.
 * 
 * Features:
 * - Flexbox column layout with consistent spacing
 * - Responsive text alignment (center on mobile, left on desktop)
 * - Vertical spacing between child elements
 * 
 * @component
 */
const AlertDialogHeader: React.FC<AlertDialogHeaderProps> = ({
  className,
  ...props
}) => (
  <div
    className={`flex flex-col space-y-2 text-center sm:text-left`}
    {...props} />
);
AlertDialogHeader.displayName = "AlertDialogHeader";

/**
 * Props interface for AlertDialogFooter component
 * @interface AlertDialogFooterProps
 */
interface AlertDialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

/**
 * Footer section for the alert dialog containing action buttons.
 * 
 * Features:
 * - Responsive layout (stacked on mobile, row on desktop)
 * - Button order optimized for each screen size
 * - Right-aligned on desktop for standard button placement
 * - Horizontal spacing between buttons on desktop
 * 
 * @component
 */
const AlertDialogFooter: React.FC<AlertDialogFooterProps> = ({
  className,
  ...props
}) => (
  <div
    className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2`}
    {...props} />
);
AlertDialogFooter.displayName = "AlertDialogFooter";

/**
 * Props interface for AlertDialogTitle component
 * @interface AlertDialogTitleProps
 */
interface AlertDialogTitleProps extends React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title> {
  /** Additional CSS classes to apply to the title */
  className?: string;
}

/**
 * Title component for the alert dialog with proper accessibility attributes.
 * 
 * Features:
 * - Large font size with semibold weight
 * - Proper ARIA labeling for screen readers
 * - Semantic heading for dialog content
 * 
 * @component
 */
const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  AlertDialogTitleProps
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={`text-lg font-semibold`}
    {...props} />
));
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName;

/**
 * Props interface for AlertDialogDescription component
 * @interface AlertDialogDescriptionProps
 */
interface AlertDialogDescriptionProps extends React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description> {
  /** Additional CSS classes to apply to the description */
  className?: string;
}

/**
 * Description component for the alert dialog with accessibility support.
 * 
 * Features:
 * - Small font size with muted color
 * - Proper ARIA description for screen readers
 * - Provides additional context for the alert
 * 
 * @component
 */
const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  AlertDialogDescriptionProps
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={`text-sm text-gray-500`}
    {...props} />
));
AlertDialogDescription.displayName = AlertDialogPrimitive.Description.displayName;

/**
 * Props interface for AlertDialogAction component
 * @interface AlertDialogActionProps
 */
interface AlertDialogActionProps extends React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action> {
  /** Additional CSS classes to apply to the action button */
  className?: string;
}

/**
 * Primary action button for the alert dialog (e.g., "Confirm", "Delete").
 * 
 * Features:
 * - Primary button styling with CSS custom property colors
 * - Hover and focus states with visual feedback
 * - Accessibility with focus rings and proper contrast
 * - Disabled state handling
 * - Consistent sizing and padding
 * - Closes dialog when clicked (Radix UI behavior)
 * 
 * @component
 */
const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  AlertDialogActionProps
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Action
    ref={ref}
    className={`inline-flex h-10 items-center justify-center rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary)]/90 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50`}
    {...props} />
));
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName;

/**
 * Props interface for AlertDialogCancel component
 * @interface AlertDialogCancelProps
 */
interface AlertDialogCancelProps extends React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel> {
  /** Additional CSS classes to apply to the cancel button */
  className?: string;
}

/**
 * Cancel/secondary button for the alert dialog (e.g., "Cancel", "Dismiss").
 * 
 * Features:
 * - Secondary button styling with white background and border
 * - Hover and focus states with subtle visual feedback
 * - Responsive margin (top margin on mobile, no margin on desktop)
 * - Accessibility with focus rings and proper contrast
 * - Disabled state handling
 * - Closes dialog without triggering action (Radix UI behavior)
 * 
 * @component
 */
const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  AlertDialogCancelProps
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    className={`mt-2 inline-flex h-10 items-center justify-center rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 sm:mt-0`}
    {...props} />
));
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName;

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};
