import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    subscriptionRepository,
    type CreateSubscriptionInput,
    type UpdateSubscriptionInput,
} from './repository';
import type { Category } from '@/types';

// Query keys
export const subscriptionKeys = {
    all: ['subscriptions'] as const,
    lists: () => [...subscriptionKeys.all, 'list'] as const,
    list: (filters: string) => [...subscriptionKeys.lists(), { filters }] as const,
    active: () => [...subscriptionKeys.all, 'active'] as const,
    details: () => [...subscriptionKeys.all, 'detail'] as const,
    detail: (id: string) => [...subscriptionKeys.details(), id] as const,
    byCategory: (category: Category) => [...subscriptionKeys.all, 'category', category] as const,
};

// Hooks

export function useSubscriptions() {
    return useQuery({
        queryKey: subscriptionKeys.lists(),
        queryFn: () => subscriptionRepository.getAll(),
    });
}

export function useActiveSubscriptions() {
    return useQuery({
        queryKey: subscriptionKeys.active(),
        queryFn: () => subscriptionRepository.getActive(),
    });
}

export function useSubscription(id: string) {
    return useQuery({
        queryKey: subscriptionKeys.detail(id),
        queryFn: () => subscriptionRepository.getById(id),
        enabled: !!id,
    });
}

export function useSubscriptionsByCategory(category: Category) {
    return useQuery({
        queryKey: subscriptionKeys.byCategory(category),
        queryFn: () => subscriptionRepository.getByCategory(category),
    });
}

export function useCreateSubscription() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: CreateSubscriptionInput) =>
            subscriptionRepository.create(input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: subscriptionKeys.all });
        },
    });
}

export function useUpdateSubscription() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, input }: { id: string; input: UpdateSubscriptionInput }) =>
            subscriptionRepository.update(id, input),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: subscriptionKeys.detail(id) });
            queryClient.invalidateQueries({ queryKey: subscriptionKeys.lists() });
            queryClient.invalidateQueries({ queryKey: subscriptionKeys.active() });
        },
    });
}

export function useToggleSubscriptionActive() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => subscriptionRepository.toggleActive(id),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: subscriptionKeys.detail(id) });
            queryClient.invalidateQueries({ queryKey: subscriptionKeys.lists() });
            queryClient.invalidateQueries({ queryKey: subscriptionKeys.active() });
        },
    });
}

export function useDeleteSubscription() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => subscriptionRepository.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: subscriptionKeys.all });
        },
    });
}

export function useSearchSubscriptions(query: string) {
    return useQuery({
        queryKey: subscriptionKeys.list(query),
        queryFn: () => subscriptionRepository.search(query),
        enabled: query.length >= 2,
    });
}

export function useMoveSubscription() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, targetId, position }: { id: string; targetId: string; position: 'before' | 'after' }) =>
            subscriptionRepository.move(id, targetId, position),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: subscriptionKeys.all });
        },
    });
}
