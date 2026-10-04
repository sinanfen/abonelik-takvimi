import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { snapshotRepository } from './repository';
import type { PaymentStatus } from '@/types';

export const snapshotKeys = {
    all: ['snapshots'] as const,
    month: (month: string) => [...snapshotKeys.all, month] as const,
};

export function useMonthlySnapshot(month: string, enabled = true) {
    return useQuery({
        queryKey: snapshotKeys.month(month),
        queryFn: () => snapshotRepository.getMonth(month),
        enabled,
    });
}

export function useSnapshotHistory() {
    return useQuery({
        queryKey: snapshotKeys.all,
        queryFn: () => snapshotRepository.getAll(),
    });
}

export function useInvalidateSnapshots() {
    const queryClient = useQueryClient();
    return () => queryClient.invalidateQueries({ queryKey: snapshotKeys.all });
}

export function useUpdateSnapshotItemStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ itemId, status }: { itemId: string; status: PaymentStatus }) =>
            snapshotRepository.updateItemStatus(itemId, status),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: snapshotKeys.all }),
    });
}

export function useUpdateSnapshotItemDetails() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ itemId, amount, date }: { itemId: string; amount: number | null; date: string }) =>
            snapshotRepository.updateItemDetails(itemId, amount, date),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: snapshotKeys.all }),
    });
}
