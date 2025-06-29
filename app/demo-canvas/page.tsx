'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function DemoCanvasPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isStamping, setIsStamping] = useState(false)
  const [stampCompleted, setStampCompleted] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)

  const playSound = (type: 'swoosh' | 'impact' | 'success') => {
    if (!soundEnabled) return
    
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

    let stampY = -100
    let rotation = 0
    let scale = 1
    let opacity = 1
    let phase = 'falling' // falling -> impact -> completed

    const stampX = canvas.width / 2
    const targetY = canvas.height / 2
    const stampRadius = 40

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // 绘制合同背景
      drawContract(ctx, canvas.width, canvas.height)

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
      } else {
        setTimeout(() => setIsStamping(false), 1000)
      }
    }

    animate()
  }

  const drawContract = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // 合同背景
    ctx.fillStyle = '#fefefe'
    ctx.fillRect(50, 50, width - 100, height - 100)
    
    // 合同边框
    ctx.strokeStyle = '#ddd'
    ctx.lineWidth = 2
    ctx.strokeRect(50, 50, width - 100, height - 100)

    // 合同标题
    ctx.fillStyle = '#333'
    ctx.font = 'bold 24px serif'
    ctx.textAlign = 'center'
    ctx.fillText('劳动合同', width / 2, 100)

    // 合同内容线条
    ctx.strokeStyle = '#eee'
    ctx.lineWidth = 1
    for (let i = 0; i < 15; i++) {
      const y = 140 + i * 25
      ctx.beginPath()
      ctx.moveTo(80, y)
      ctx.lineTo(width - 80, y)
      ctx.stroke()
    }

    // 签名区域
    ctx.fillStyle = '#666'
    ctx.font = '16px serif'
    ctx.textAlign = 'left'
    ctx.fillText('甲方签字：', 80, height - 80)
    ctx.fillText('乙方签字：', width / 2 + 20, height - 80)
  }

  const drawStamp = (ctx: CanvasRenderingContext2D, x: number, y: number, rotation: number, scale: number, opacity: number) => {
    ctx.save()
    ctx.globalAlpha = opacity
    ctx.translate(x, y)
    ctx.rotate(rotation)
    ctx.scale(scale, scale)

    // 印章外圈
    ctx.strokeStyle = '#d32f2f'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.arc(0, 0, 35, 0, Math.PI * 2)
    ctx.stroke()

    // 印章内容
    ctx.fillStyle = '#d32f2f'
    ctx.font = 'bold 14px serif'
    ctx.textAlign = 'center'
    ctx.fillText('律师', 0, -8)
    ctx.fillText('印章', 0, 12)

    // 印章光泽效果
    const gradient = ctx.createRadialGradient(-10, -10, 0, 0, 0, 35)
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)')
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = gradient
    ctx.fill()

    ctx.restore()
  }

  const drawStampedSeal = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.save()
    ctx.globalAlpha = 0.8

    // 盖章痕迹 - 保持白底
    ctx.fillStyle = 'white'
    ctx.beginPath()
    ctx.arc(x, y, 35, 0, Math.PI * 2)
    ctx.fill()

    // 印章外圈 - 红色边框
    ctx.strokeStyle = '#d32f2f'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(x, y, 35, 0, Math.PI * 2)
    ctx.stroke()

    // 印章文字 - 红色文字
    ctx.fillStyle = '#d32f2f'
    ctx.font = 'bold 14px serif'
    ctx.textAlign = 'center'
    ctx.fillText('律师', x, y - 8)
    ctx.fillText('印章', x, y + 12)

    ctx.restore()
  }


  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      canvas.width = 600
      canvas.height = 400
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    return () => window.removeEventListener('resize', resizeCanvas)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            合同盖章动画演示
          </h1>
          <p className="text-gray-600">二次元风格的动态印章效果</p>
        </div>

        <Card className="p-6 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <div className="flex flex-col items-center space-y-6">
            <canvas
              ref={canvasRef}
              className="border-2 border-gray-200 rounded-lg shadow-lg bg-white"
              style={{
                filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.1))'
              }}
            />
            
            <div className="flex gap-4 items-center">
              <Button
                onClick={startStampAnimation}
                disabled={isStamping}
                className={`px-8 py-3 text-lg font-semibold transition-all duration-300 ${
                  isStamping 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 transform hover:scale-105 shadow-lg hover:shadow-xl'
                }`}
              >
                {isStamping ? '盖章中...' : '开始盖章'}
              </Button>

              <Button
                onClick={() => setSoundEnabled(!soundEnabled)}
                variant="outline"
                className="px-4 py-2"
              >
                {soundEnabled ? '🔊' : '🔇'}
              </Button>
              
              {stampCompleted && (
                <div className="flex items-center text-green-600 font-semibold animate-bounce">
                  <span className="text-2xl mr-2">✨</span>
                  盖章完成！
                  <span className="text-2xl ml-2">✨</span>
                </div>
              )}
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4 bg-white/60 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">🎬 动画效果</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 印章从上方落下并旋转</li>
              <li>• 接触合同时产生震动效果</li>
              <li>• 印章缩放并逐渐固定</li>
              <li>• 最终留下红字白底律师印章</li>
            </ul>
          </Card>

          <Card className="p-4 bg-white/60 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">🎵 音效系统</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 下落时的风声效果</li>
              <li>• 撞击时的低频震动音</li>
              <li>• 完成时的成功音效</li>
              <li>• 可通过按钮开关音效</li>
            </ul>
          </Card>
        </div>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
          20%, 40%, 60%, 80% { transform: translateX(2px); }
        }
      `}</style>
    </div>
  )
}