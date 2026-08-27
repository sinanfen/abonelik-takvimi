import { useQuery, useQueryClient } from '@tanstack/react-query';
import { snapshotRepository } from './repository';

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
