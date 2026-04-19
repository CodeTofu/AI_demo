import { useCallback, useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { getToken } from '../utils/auth'

/** WebSocket 目标（与 Vite 开发时后端端口一致；生产可配 VITE_WS_ORIGIN） */
const WS_ORIGIN = import.meta.env.VITE_WS_ORIGIN ?? 'http://localhost:3001'

/**
 * Socket.IO：连接 `/realtime`，监听持仓推送；可选发 client:ping 收 pong。
 */
export function usePortfolioRealtime(onPortfolioUpdate: () => void) {
  const cbRef = useRef(onPortfolioUpdate)
  cbRef.current = onPortfolioUpdate

  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [lastEvent, setLastEvent] = useState<string>('')
  const [lastPongMs, setLastPongMs] = useState<number | null>(null)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setConnected(false)
      return
    }

    const socket = io(`${WS_ORIGIN}/realtime`, {
      auth: { token },
      transports: ['websocket'],
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      setLastEvent('已连接')
    })
    socket.on('disconnect', () => {
      setConnected(false)
      setLastEvent('已断开')
    })
    socket.on('connect_error', (err: Error) => {
      setLastEvent(err.message || '连接失败')
    })
    socket.on('connected', (payload: { message?: string }) => {
      if (payload?.message) setLastEvent(payload.message)
    })
    socket.on('portfolio:update', () => {
      setLastEvent('收到 portfolio:update，刷新数据')
      cbRef.current()
    })
    socket.on('pong', (data: { t?: number }) => {
      if (typeof data?.t === 'number') setLastPongMs(data.t)
      setLastEvent('收到 pong')
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [])

  const sendPing = useCallback(() => {
    socketRef.current?.emit('client:ping')
  }, [])

  return { connected, lastEvent, lastPongMs, sendPing }
}
