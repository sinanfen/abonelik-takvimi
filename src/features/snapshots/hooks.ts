import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { snapshotRepository } from './repository';
import type { PaymentStatus } from '@/types';

export const snapshotKeys = {
    all: ['snapshots'] as const,
    month: (month: string) => [...snapshotKeys.all, month] as const,
};

export function useMonthlySnapshot(month: string) {
    return useQuery({
        queryKey: snapshotKeys.month(month),
        queryFn: () => snapshotRepository.getMonth(month),
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
