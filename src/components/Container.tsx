import { useEffect, useRef, useState } from 'react'

const JUMP_DURATION = 800

const tailWidth = 40
const hornWidth = 20

const Container = () => {
  const [score, setScore] = useState(0)
  const [isGameOver, setIsGameOver] = useState(false)

  const playerRef = useRef<HTMLDivElement>(null)
  const obstacleRef = useRef<HTMLDivElement>(null)
  const collisionIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const jump = () => {
    const player = playerRef.current
    if (player && !player.classList.contains('jump')) {
      player.classList.add('jump')
    }

    setTimeout(() => {
      player?.classList.remove('jump')
    }, JUMP_DURATION)
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === ' ') jump()
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const isCollided = () => {
    const playerClientRect = playerRef.current?.getBoundingClientRect()
    const obstacleClientRect = obstacleRef.current?.getBoundingClientRect()
    if (!playerClientRect || !obstacleClientRect) return false

    const { left: playerL, right: playerR, bottom: playerB } = playerClientRect
    const { left: obstacleL, right: obstacleR, top: obstacleT } = obstacleClientRect

    const xCollision = obstacleR - tailWidth > playerL && obstacleL < playerR - hornWidth
    const yCollision = playerB > obstacleT

    return xCollision && yCollision
  }

  useEffect(() => {
    if (isGameOver) {
      console.log('-----gameOver', collisionIntervalRef.current)
      clearInterval(collisionIntervalRef.current!)
      return
    }

    collisionIntervalRef.current = setInterval(() => {
      if (isCollided()) {
        setIsGameOver(true)
        console.log('-----isCollided')
      }
    }, 100)

    return () => {
      if (collisionIntervalRef.current) {
        console.log('-----clearInterval', isGameOver)
        clearInterval(collisionIntervalRef.current)
      }
    }
  }, [isGameOver])

  const restart = () => {
    setIsGameOver(false)
    setScore(0)
    obstacleRef.current!.style.animation = 'none'
    void obstacleRef.current!.offsetWidth
    obstacleRef.current!.style.animation = 'move 3s linear infinite'
  }

  return (
    <div
      className='game-container'
      style={{
        animationPlayState: isGameOver ? 'paused' : 'running'
      }}
    >
      <div className='score-card'>{score}</div>
      <div
        ref={playerRef}
        className={`player ${isGameOver ? 'stop' : ''}`}
        style={{
          animationDuration: `${JUMP_DURATION}ms`
        }}
      />

      <div
        ref={obstacleRef}
        className='obstacle'
        style={{
          animationPlayState: isGameOver ? 'paused' : 'running'
        }}
      />

      {isGameOver && (
        <div className='restart-game'>
          <button onClick={restart} className='btn-reset-game'>
            RESTART
          </button>
        </div>
      )}
    </div>
  )
}

export default Container
