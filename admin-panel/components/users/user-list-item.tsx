"use client";

import type { User } from "@/lib/api/users";
import { CanGhostButton } from "../shared/can-button";
import { Mail, Monitor } from "lucide-react";

type Props = {
    user: User;
    onEdit: () => void;
    onDelete: () => void;
    onViewSessions?: () => void;
    onInvite?: () => void;
};

function initialsOf(user: User): string {
    const source = user.name?.trim() || user.email;
    const parts = source.split(/\s+/);
    if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatLastLogin(lastLoginAt: string | null): string {
    if (!lastLoginAt) return "nunca";

    const diff = Date.now() - new Date(lastLoginAt).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "agora";
    if (min < 60) return `há ${min} min`;

    const hours = Math.floor(min / 60);
    if (hours < 24) return `há ${hours}h`;

    const days = Math.floor(hours / 24);
    if (days < 30) return `há ${days}d`;

    return new Date(lastLoginAt).toLocaleDateString("pt-BR");
}

export function UserListItem({
    user,
    onEdit,
    onDelete,
    onViewSessions,
    onInvite,
}: Props) {
    const isVerified = user.emailVerified !== null;

    return (
        <tr className="border-t border-border">
            <td className="p-3">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-violet-600 text-white flex items-center justify-center text-xs font-bold">
                        {initialsOf(user)}
                    </div>
                    <div className="min-w-0">
                        <p className="font-medium text-sm truncate">
                            {user.name ?? "—"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                            {user.email}
                        </p>
                    </div>
                </div>
            </td>

            <td className="p-3">
                <div className="flex gap-1 flex-wrap">
                    {user.roles.length === 0 ? (
                        <span className="text-xs text-muted-foreground">sem cargo</span>
                    ) : (
                        user.roles.map((r) => (
                            <span
                                key={r.id}
                                className="text-xs bg-muted px-2 py-0.5 rounded-full border border-border"
                            >
                                {r.name}
                            </span>
                        ))
                    )}
                </div>
            </td>

            <td className="p-3 text-xs text-muted-foreground">
                {formatLastLogin(user.lastLoginAt)}
            </td>

            <td className="p-3 text-right whitespace-nowrap">
                {onInvite && !isVerified && (
                    <CanGhostButton
                        permission="iam.users.update"
                        onClick={onInvite}
                        className="mr-2 border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                        title="Enviar convite"
                    >
                        <Mail size={14} className="inline mr-1" />
                        Convidar
                    </CanGhostButton>
                )}
                <CanGhostButton
                    permission="iam.users.read"
                    onClick={onViewSessions}
                    className="mr-2"
                    title="Ver sessões"
                >
                    <Monitor size={14} />
                </CanGhostButton>
                <CanGhostButton
                    permission="iam.users.update"
                    onClick={onEdit}
                    className="mr-2"
                >
                    Editar
                </CanGhostButton>
                <CanGhostButton
                    permission="iam.users.delete"
                    onClick={onDelete}
                    className="border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                    Deletar
                </CanGhostButton>
            </td>
        </tr>
    );
}