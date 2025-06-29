'use client'

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'

interface StampAnimationProps {
  onComplete?: () => void
  soundEnabled?: boolean
}

export interface StampAnimationRef {
  startAnimation: () => void
}

export const StampAnimation = forwardRef<StampAnimationRef, StampAnimationProps>(
  ({ onComplete, soundEnabled = true }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [isStamping, setIsStamping] = useState(false)
    const [stampCompleted, setStampCompleted] = useState(false)

    const playSound = (type: 'swoosh' | 'impact' | 'success') => {
      if (!soundEnabled) return
      
      try {
        // 创建音频上下文来生成简单的音效
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()
        
        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)
        
        switch (type) {
          case 'swoosh':
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
            oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.3)
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
            oscillator.start()
            oscillator.stop(audioContext.currentTime + 0.3)
            break
          case 'impact':
            oscillator.frequency.setValueAtTime(150, audioContext.currentTime)
            oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.1)
            gainNode.gain.setValueAtTime(0.4, audioContext.currentTime)
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)
            oscillator.start()
            oscillator.stop(audioContext.currentTime + 0.1)
            break
          case 'success':
            oscillator.frequency.setValueAtTime(523, audioContext.currentTime) // C5
            oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.1) // E5
            oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.2) // G5
            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime)
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4)
            oscillator.start()
            oscillator.stop(audioContext.currentTime + 0.4)
            break
        }
      } catch (error) {
        console.warn('音效播放失败:', error)
      }
    }

    const startStampAnimation = () => {
      if (isStamping) return
      setIsStamping(true)
      setStampCompleted(false)
      
      playSound('swoosh')

      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      let stampY = -80
      let rotation = 0
      let scale = 1
      let opacity = 1
      let phase = 'falling' // falling -> impact -> completed

      const stampX = canvas.width / 2
      const targetY = canvas.height / 2 + 50
      const stampRadius = 35

      const animate = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // 绘制文档背景
        drawDocument(ctx, canvas.width, canvas.height)

        if (phase === 'falling') {
          stampY += 8
          rotation += 0.3
          
          if (stampY >= targetY - stampRadius) {
            phase = 'impact'
            playSound('impact')
            // 震动效果
            canvas.style.animation = 'shake 0.3s ease-in-out'
          }
        } else if (phase === 'impact') {
          scale = Math.max(0.8, scale - 0.05)
          opacity = Math.max(0.3, opacity - 0.03)
          
          if (scale <= 0.8) {
            phase = 'completed'
            setStampCompleted(true)
            playSound('success')
            canvas.style.animation = ''
            setTimeout(() => {
              setIsStamping(false)
              onComplete?.()
            }, 800)
          }
        }

        // 绘制印章
        if (phase !== 'completed') {
          drawStamp(ctx, stampX, stampY, rotation, scale, opacity)
        } else {
          drawStampedSeal(ctx, stampX, targetY)
        }

        if (phase !== 'completed') {
          requestAnimationFrame(animate)
        }
      }

      animate()
    }

    const drawDocument = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      // 文档背景
      ctx.fillStyle = '#fefefe'
      ctx.fillRect(20, 20, width - 40, height - 40)
      
      // 文档边框
      ctx.strokeStyle = '#ddd'
      ctx.lineWidth = 2
      ctx.strokeRect(20, 20, width - 40, height - 40)

      // 文档标题
      ctx.fillStyle = '#333'
      ctx.font = 'bold 18px serif'
      ctx.textAlign = 'center'
      ctx.fillText('法律文书', width / 2, 50)

      // 文档内容线条
      ctx.strokeStyle = '#f0f0f0'
      ctx.lineWidth = 1
      for (let i = 0; i < 8; i++) {
        const y = 80 + i * 20
        ctx.beginPath()
        ctx.moveTo(40, y)
        ctx.lineTo(width - 40, y)
        ctx.stroke()
      }

      // 签名区域提示
      ctx.fillStyle = '#888'
      ctx.font = '12px serif'
      ctx.textAlign = 'right'
      ctx.fillText('签名盖章处', width - 50, height - 40)
    }

    const drawStamp = (ctx: CanvasRenderingContext2D, x: number, y: number, rotation: number, scale: number, opacity: number) => {
      ctx.save()
      ctx.globalAlpha = opacity
      ctx.translate(x, y)
      ctx.rotate(rotation)
      ctx.scale(scale, scale)

      // 印章外圈
      ctx.strokeStyle = '#d32f2f'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(0, 0, 30, 0, Math.PI * 2)
      ctx.stroke()

      // 印章内容
      ctx.fillStyle = '#d32f2f'
      ctx.font = 'bold 12px serif'
      ctx.textAlign = 'center'
      ctx.fillText('律师', 0, -6)
      ctx.fillText('印章', 0, 10)

      // 印章光泽效果
      const gradient = ctx.createRadialGradient(-8, -8, 0, 0, 0, 30)
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)')
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = gradient
      ctx.fill()

      ctx.restore()
    }

    const drawStampedSeal = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
      ctx.save()
      ctx.globalAlpha = 0.9

      // 盖章痕迹 - 白底
      ctx.fillStyle = 'white'
      ctx.beginPath()
      ctx.arc(x, y, 30, 0, Math.PI * 2)
      ctx.fill()

      // 印章外圈 - 红色边框
      ctx.strokeStyle = '#d32f2f'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(x, y, 30, 0, Math.PI * 2)
      ctx.stroke()

      // 印章文字 - 红色文字
      ctx.fillStyle = '#d32f2f'
      ctx.font = 'bold 12px serif'
      ctx.textAlign = 'center'
      ctx.fillText('律师', x, y - 6)
      ctx.fillText('印章', x, y + 10)

      // 添加完成特效
      if (stampCompleted) {
        ctx.save()
        ctx.globalAlpha = 0.6
        ctx.strokeStyle = '#ffd700'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(x, y, 35, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()
      }

      ctx.restore()
    }

    useImperativeHandle(ref, () => ({
      startAnimation: startStampAnimation
    }))

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return

      const resizeCanvas = () => {
        canvas.width = 350
        canvas.height = 250
        
        // 初始绘制文档
        const ctx = canvas.getContext('2d')
        if (ctx) {
          drawDocument(ctx, canvas.width, canvas.height)
        }
      }

      resizeCanvas()
      window.addEventListener('resize', resizeCanvas)

      return () => window.removeEventListener('resize', resizeCanvas)
    }, [])

    return (
      <div className="flex flex-col items-center space-y-4">
        <canvas
          ref={canvasRef}
          className="border border-gray-200 rounded-lg shadow-md bg-white"
          style={{
            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.1))'
          }}
        />
        
        {stampCompleted && (
          <div className="flex items-center text-emerald-600 font-semibold animate-bounce">
            <span className="text-xl mr-2">✨</span>
            盖章完成！
            <span className="text-xl ml-2">✨</span>
          </div>
        )}

        <style jsx>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-1px); }
            20%, 40%, 60%, 80% { transform: translateX(1px); }
          }
        `}</style>
      </div>
    )
  }
)

StampAnimation.displayName = 'StampAnimation'