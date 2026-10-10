"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import { ApiError } from "@/lib/api"
import {
  UsersAPI,
  type User,
  type CreateUserInput,
  type UpdateUserInput,
} from "@/lib/api/users"
import { RolesAPI, type Role } from "@/lib/api/roles"
import { useAuthStore } from "@/stores/useAuthStore"

export function useUsers() {
  const selectedTenantId = useAuthStore((s) => s.selectedTenantId)

  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!selectedTenantId) {
      setUsers([])
      setRoles([])
      return
    }

    setLoading(true)
    try {
      const [usersData, rolesData] = await Promise.all([
        UsersAPI.list(selectedTenantId),
        RolesAPI.list(selectedTenantId),
      ])
      setUsers(usersData)
      setRoles(rolesData)
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(`Erro ao carregar usuários (${err.status})`)
      } else {
        toast.error("Erro ao carregar usuários")
      }
      setUsers([])
      setRoles([])
    } finally {
      setLoading(false)
    }
  }, [selectedTenantId])

  useEffect(() => {
    void load()
  }, [load])

  async function createUser(input: Omit<CreateUserInput, "tenantId">) {
    if (!selectedTenantId) {
      toast.error("Nenhum tenant selecionado")
      return false
    }

    setSaving(true)
    try {
      await UsersAPI.create({
        ...input,
        tenantId: selectedTenantId,
      })
      toast.success("Usuário criado")
      await load()
      return true
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          toast.error("E-mail já está em uso!")
        } else if (err.status === 403) {
          toast.error("Sem permissão")
        } else if (err.status === 404) {
          toast.error("Role inválida")
        } else {
          toast.error(`Erro ao criar usuário (${err.status})`)
        }
      } else {
        toast.error("Erro ao criar usuário")
      }
      return false
    } finally {
      setSaving(false)
    }
  }

  async function updateUser(id: string, input: UpdateUserInput) {
    setSaving(true)
    try {
      await UsersAPI.update(id, input)
      toast.success("Usuário atualizado")
      await load()
      return true
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          toast.error("E-mail já está em uso! ")
        } else if (err.status === 403) {
          toast.error("Sem permissão")
        } else if (err.status === 404) {
          toast.error("Usuário ou role não encontrado")
        } else {
          toast.error(`Erro ao atualizar (${err.status})`)
        }
      } else {
        toast.error("Erro ao atualizar usuário")
      }
      return false
    } finally {
      setSaving(false)
    }
  }

  async function deleteUser(id: string) {
    try {
      await UsersAPI.remove(id)
      toast.success("Usuário removido")
      await load()
      return true
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        toast.error("Sem permissão")
      } else {
        toast.error("Erro ao remover usuário")
      }
      return false
    }
  }

  async function inviteUser(id: string) {
    try {
      await UsersAPI.invite(id)
      toast.success("Convite enviado")
      await load()
      return true
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        toast.error("Sem permissão")
      } else if (err instanceof ApiError && err.status === 404) {
        toast.error("Usuário não encontrado")
      } else {
        toast.error("Erro ao enviar convite")
      }
      return false
    }
  }

  return {
    users,
    roles,
    loading,
    saving,
    inviteUser,
    createUser,
    updateUser,
    deleteUser,
    reload: load,
  }
}
