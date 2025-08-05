import * as faceapi from 'face-api.js'
import { useEffect, useRef, useState } from 'react'

import { GameState } from '../types'

const HEIGHT = 420
const WIDTH = 640

interface Props {
  onHappyLevelChange: (happyLevel: number) => void
  gameState: GameState
}

const Webcam: React.FC<Props> = ({ onHappyLevelChange, gameState }) => {
  const [modelsLoaded, setModelsLoaded] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined)

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = '/models'

      Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
      ]).then(() => setModelsLoaded(true))
    }
    loadModels()
  }, [])

  useEffect(() => {
    if (gameState === GameState.PLAYING) startVideo()
    else if (gameState === GameState.GAME_OVER) closeWebcam()
  }, [gameState])

  const startVideo = async () => {
    onHappyLevelChange(0)

    navigator.mediaDevices
      .getUserMedia({ video: { width: 300 } })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
      })
      .catch((err) => {
        console.error('error:', err)
      })
  }

  const handleVideoOnPlay = () => {
    intervalRef.current = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current) return

      canvasRef.current.innerHTML = faceapi.createCanvasFromMedia(videoRef.current)
      faceapi.matchDimensions(canvasRef.current, {
        width: WIDTH,
        height: HEIGHT
      })

      const detections = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceExpressions()
      if (!detections) return

      const resized = faceapi.resizeResults(detections, {
        width: WIDTH,
        height: HEIGHT
      })

      const detection = detections?.expressions.asSortedArray()[0]
      console.log('happy', detection, detections.expressions)
      if (resized && detection?.expression === 'happy') {
        onHappyLevelChange(detection.probability)
        faceapi.draw.drawDetections(canvasRef.current, resized)
        faceapi.draw.drawFaceExpressions(canvasRef.current, resized)
      } else onHappyLevelChange(0)
    }, 200)
  }

  const closeWebcam = () => {
    if (!videoRef.current) return

    videoRef.current.pause()
    ;(videoRef.current.srcObject as MediaStream).getTracks()[0].stop()
    clearInterval(intervalRef.current!)
  }

  if (!modelsLoaded) return null

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '10px' }}>
      <video ref={videoRef} height={HEIGHT} width={WIDTH} onPlay={handleVideoOnPlay} style={{ borderRadius: '10px' }} />
      <canvas ref={canvasRef} style={{ position: 'absolute' }} />
    </div>
  )
}

export default Webcam
