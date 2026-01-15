import { useEffect, useState } from "react";
import { redirect, useRouter } from 'next/navigation'

export type UserInfo = {
  id: string,
  email: string
  name: string
  avatar_base64: string
  access_token: string,
  expires_at: number,
  userId: string
}

export default function useUserInfo() {
  const [ userInfo, setUserInfo ] = useState<UserInfo>()
  const [ loggedIn, setLoggedIn ] = useState<boolean>()

  useEffect(() => {
    const userData = getUserInfo()

    if(!userData || userData.expires_at < (Date.now() / 1000)) {
      setLoggedIn(false)
    }
    else {
      setLoggedIn(true)
      setUserInfo(userData)
    }
  }, [])

  return {...userInfo, loggedIn}
}

export function getUserInfo() {
  if(!globalThis.window || !globalThis.window.localStorage) return null

  const userData = window.localStorage.userInfo
  if(userData) {
    const user = JSON.parse(userData)
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_base64: user.avatar_base64,
      access_token: getTokens()?.access_token,
      expires_at: getTokens()?.expires_at,
      userId: user.id
    }
  }
  return null
}

export function getTokens() {
  if(!globalThis.window || !globalThis.window.localStorage) return null

  const host = window.location.hostname
  const oidc = window.localStorage[`modern-oidc.user:https://${host}/oidc:dataos_generic`]
  if(oidc) {
      const ids = JSON.parse(oidc)
      return {
        access_token: ids.access_token,
        expires_at: ids.expires_at,
      }
    } else {
      return null
    }
}
