import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
    'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
    {
        variants: {
            variant: {
                default:
                    'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
                secondary:
                    'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
                destructive:
                    'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
                outline: 'text-foreground',
                // Category variants
                banking: 'border-category-banking/30 bg-category-banking/20 text-category-banking',
                entertainment: 'border-category-entertainment/30 bg-category-entertainment/20 text-category-entertainment',
                bills: 'border-category-bills/30 bg-category-bills/20 text-category-bills',
                saas: 'border-category-saas/30 bg-category-saas/20 text-category-saas',
                insurance: 'border-category-insurance/30 bg-category-insurance/20 text-category-insurance',
                shopping: 'border-category-shopping/30 bg-category-shopping/20 text-category-shopping',
                other: 'border-category-other/30 bg-category-other/20 text-category-other',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    }
);

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    );
}

export { Badge, badgeVariants };
