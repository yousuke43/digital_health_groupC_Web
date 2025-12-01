import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRM, VRMLoaderPlugin } from '@pixiv/three-vrm';

const VRM_MODEL_PATH = '/AvatarSample_A.vrm';

// ★ 音量解析の解像度
const ANALYSER_FFT_SIZE = 2048; // 1024や2048が一般的

// コンポーネントを forwardRef でラップ
const VrmViewer = forwardRef(({ audioData }, ref) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const threeObjects = useRef({
    scene: null,
    camera: null,
    renderer: null,
    clock: null,
    vrm: null,
    vrmMixer: null,
    animationFrameId: null,
    audioContext: null,
    audioBufferSource: null,
    analyser: null,
    timeDomainData: new Uint8Array(ANALYSER_FFT_SIZE),
  });

  // --- Three.js初期化 ---
  useEffect(() => {
    const { current: canvas } = canvasRef;
    const { current: container } = containerRef;
    if (!canvas || !container) return;

    const refs = threeObjects.current;

    // シーン、カメラ、ライト
    refs.scene = new THREE.Scene();
    refs.scene.background = new THREE.Color(0xeeeeee);
    const aspect = container.clientWidth / container.clientHeight;
    refs.camera = new THREE.PerspectiveCamera(30.0, aspect, 0.1, 20.0);
    refs.camera.position.set(0.0, 1.3, 1.0);
    const light = new THREE.DirectionalLight(0xffffff, 1.7);
    light.position.set(0.0, 3.0, 5.0);
    refs.scene.add(light);
    refs.scene.add(new THREE.AmbientLight(0xffffff, 1.5));

    // レンダラー
    refs.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    refs.renderer.setSize(container.clientWidth, container.clientHeight);
    refs.renderer.setPixelRatio(window.devicePixelRatio);

    // --- VRMロード ---
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    loader.load(
      VRM_MODEL_PATH,
      (gltf) => {
        const vrm = gltf.userData.vrm;
        if (!vrm) {
          console.error('VRMの読み込みに失敗しました: gltf.userData.vrm が見つかりません。');
          return;
        }

        refs.vrm = vrm;
        refs.scene.add(refs.vrm.scene);

        // 腕の回転処理
        try {
          const leftUpperArm = vrm.humanoid.getNormalizedBoneNode('leftUpperArm');
          if (leftUpperArm) leftUpperArm.rotation.z = -Math.PI * 100 / 360;
          const rightUpperArm = vrm.humanoid.getNormalizedBoneNode('rightUpperArm');
          if (rightUpperArm) rightUpperArm.rotation.z = Math.PI * 100 / 360;
        } catch (e) {
          console.error('腕の回転処理中にエラー:', e);
        }

        // カメラの向き
        const head = vrm.humanoid.getNormalizedBoneNode('head');
        refs.camera.lookAt(head ? head.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(0.0, 1.3, 0.0));

        refs.vrmMixer = new THREE.AnimationMixer(vrm.scene);

        if (refs.vrm.expressionManager) {
          refs.vrm.expressionManager.autoUpdate = false; // ← 手動制御モードに変更
          refs.vrm.expressionManager.setValue('aa', 1);
          refs.vrm.expressionManager.update();
        }

        console.log('VRMモデルの読み込みが完了しました。');
        console.log('利用可能な表情一覧:', refs.vrm.expressionManager?.expressionNames);
      },
      (progress) => console.log(`VRM読み込み中: ${Math.round(100 * progress.loaded / progress.total)}%`),
      (error) => console.error('VRMの読み込みに失敗しました:', error)
    );

    // --- アニメーションループ ---
    refs.clock = new THREE.Clock();
    const animate = () => {
      refs.animationFrameId = requestAnimationFrame(animate);
      const delta = refs.clock.getDelta();

      updateLipSyncAnimation();

      if (refs.vrmMixer) refs.vrmMixer.update(delta);
      if (refs.vrm) refs.vrm.update(delta);

      refs.renderer.render(refs.scene, refs.camera);
    };
    animate();

    // --- リサイズ対応 ---
    const onResize = () => {
      if (!refs.renderer || !refs.camera || !container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      refs.renderer.setSize(width, height);
      refs.camera.aspect = width / height;
      refs.camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    // --- クリーンアップ ---
    return () => {
      window.removeEventListener('resize', onResize);
      if (refs.animationFrameId) cancelAnimationFrame(refs.animationFrameId);
      if (refs.renderer) refs.renderer.dispose();
      if (refs.audioContext) refs.audioContext.close();
    };
  }, []);

  // --- AudioContext初期化 ---
  const initAudioContextForLipSync = () => {
    const refs = threeObjects.current;
    if (refs.audioContext) {
      if (refs.audioContext.state === 'suspended') refs.audioContext.resume();
      return true;
    }
    try {
      refs.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      refs.analyser = refs.audioContext.createAnalyser();
      refs.analyser.fftSize = ANALYSER_FFT_SIZE;
      refs.analyser.smoothingTimeConstant = 0.5;
      return true;
    } catch (e) {
      console.error('AudioContextの初期化に失敗:', e);
      return false;
    }
  };

  useImperativeHandle(ref, () => ({
    startAudioContext: () => initAudioContextForLipSync(),
  }));

  // --- 音声データを受け取って再生 ---
  useEffect(() => {
    if (!audioData) return;
    const refs = threeObjects.current;
    if (!initAudioContextForLipSync() || !refs.analyser) return;

    const play = async () => {
      try {
        const audioDataCopy = audioData.slice(0);
        const audioBuffer = await refs.audioContext.decodeAudioData(audioDataCopy);

        if (refs.audioBufferSource) {
          refs.audioBufferSource.stop();
          refs.audioBufferSource.disconnect();
        }

        refs.audioBufferSource = refs.audioContext.createBufferSource();
        refs.audioBufferSource.buffer = audioBuffer;
        refs.audioBufferSource.connect(refs.analyser);
        refs.analyser.connect(refs.audioContext.destination);

        refs.audioBufferSource.onended = () => {
          if (refs.vrm?.expressionManager) {
            refs.vrm.expressionManager.setValue('aa', 0);
            refs.vrm.expressionManager.update(); // ← 追加
          }
          refs.audioBufferSource = null;
        };

        refs.audioBufferSource.start(0);
      } catch (e) {
        console.error('音声再生中にエラー:', e);
        if (refs.vrm?.expressionManager) {
          refs.vrm.expressionManager.setValue('aa', 0);
          refs.vrm.expressionManager.update();
        }
        refs.audioBufferSource = null;
      }
    };
    play();
  }, [audioData]);

  // --- 口パク制御 ---
  const updateLipSyncAnimation = () => {
    const refs = threeObjects.current;
    if (!refs.vrm?.expressionManager || !refs.analyser || !refs.audioBufferSource) return;

    refs.analyser.getByteTimeDomainData(refs.timeDomainData);
    let sumOfSquares = 0.0;
    for (let i = 0; i < ANALYSER_FFT_SIZE; i++) {
      const norm = (refs.timeDomainData[i] / 128.0) - 1.0;
      sumOfSquares += norm * norm;
    }
    const volume = Math.sqrt(sumOfSquares / ANALYSER_FFT_SIZE);
    let lipWeight = Math.min(1.0, Math.max(0.0, volume * 5.0));
    if (lipWeight < 0.1) lipWeight = 0.0;

    refs.vrm.expressionManager.setValue('aa', lipWeight);
    refs.vrm.expressionManager.update(); // ← 追加
  };

  // --- テスト音声を再生 ---
  const playTestAudio = () => {
    const refs = threeObjects.current;
    if (!initAudioContextForLipSync() || !refs.analyser) return;

    const testAudioUrl = '/test-audio.wav'; // ← public削除済み

    const play = async () => {
      try {
        const response = await fetch(testAudioUrl);
        const audioData = await response.arrayBuffer();
        const audioBuffer = await refs.audioContext.decodeAudioData(audioData);

        if (refs.audioBufferSource) {
          refs.audioBufferSource.stop();
          refs.audioBufferSource.disconnect();
        }

        refs.audioBufferSource = refs.audioContext.createBufferSource();
        refs.audioBufferSource.buffer = audioBuffer;
        refs.audioBufferSource.connect(refs.analyser);
        refs.analyser.connect(refs.audioContext.destination);

        refs.audioBufferSource.onended = () => {
          if (refs.vrm?.expressionManager) {
            refs.vrm.expressionManager.setValue('aa', 0);
            refs.vrm.expressionManager.update(); // ← 追加
          }
          refs.audioBufferSource = null;
        };

        refs.audioBufferSource.start(0);
      } catch (e) {
        console.error('テスト音声の再生に失敗しました:', e);
        if (refs.vrm?.expressionManager) {
          refs.vrm.expressionManager.setValue('aa', 0);
          refs.vrm.expressionManager.update();
        }
        refs.audioBufferSource = null;
      }
    };
    play();
  };

  // --- JSX ---
  return (
    <div ref={containerRef} id="vrm-canvas-container" style={{ position: 'relative' }}>
      <canvas ref={canvasRef} />
      <button
        onClick={playTestAudio}
        style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          padding: '10px 20px',
          backgroundColor: '#007BFF',
          color: '#FFF',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
        }}
      >
        テスト音声を再生
      </button>
    </div>
  );
});

export default VrmViewer;
