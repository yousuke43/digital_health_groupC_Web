import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRM, VRMLoaderPlugin } from '@pixiv/three-vrm';

const VRM_MODEL_PATH = '/Character1.vrm';

// ★ 音量解析の解像度
const ANALYSER_FFT_SIZE = 2048; // 1024や2048が一般的

// コンポーネントを forwardRef でラップ
const VrmViewer = forwardRef(({ audioData }, ref) => { // ★ expressionName を一時的に削除
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
    // ★★★ 1. timeDomainData を Uint8Array に変更 ★★★
    timeDomainData: new Uint8Array(ANALYSER_FFT_SIZE), 
  });

  // 1. Three.jsシーンの初期化
  useEffect(() => {
    const { current: canvas } = canvasRef;
    const { current: container } = containerRef;
    if (!canvas || !container) return;

    const refs = threeObjects.current;

    // --- シーン、カメラ、ライト ---
    refs.scene = new THREE.Scene();
    refs.scene.background = new THREE.Color(0xeeeeee);
    const aspect = container.clientWidth / container.clientHeight;
    refs.camera = new THREE.PerspectiveCamera(30.0, aspect, 0.1, 20.0);
    refs.camera.position.set(0.0, 1.3, 1.0);
    const light = new THREE.DirectionalLight(0xffffff, 1.7);
    light.position.set(0.0, 3.0, 5.0);
    refs.scene.add(light);
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    refs.scene.add(ambientLight);

    // --- レンダラー ---
    refs.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    refs.renderer.setSize(container.clientWidth, container.clientHeight);
    refs.renderer.setPixelRatio(window.devicePixelRatio);

    // --- VRMのロード ---
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    loader.load(
      VRM_MODEL_PATH,
      (gltf) => {
        const vrm = gltf.userData.vrm;
        if (!vrm) {
          console.error("VRMの読み込みに失敗しました: gltf.userData.vrm が見つかりません。");
          return;
        }
        
        refs.vrm = vrm;
        refs.scene.add(refs.vrm.scene);

        // ( ... 腕の回転処理 ... )
        try {
          const leftUpperArm = vrm.humanoid.getNormalizedBoneNode('leftUpperArm');
          if (leftUpperArm) leftUpperArm.rotation.z = -Math.PI * 100 / 360;
          else console.warn('Left upper arm bone not found');
          const rightUpperArm = vrm.humanoid.getNormalizedBoneNode('rightUpperArm');
          if (rightUpperArm) rightUpperArm.rotation.z = Math.PI * 100 / 360;
          else console.warn('Right upper arm bone not found');
        } catch (e) { console.error("腕の回転処理中にエラー:", e); }

        const head = refs.vrm.humanoid.getNormalizedBoneNode('head');
        if (head) refs.camera.lookAt(head.getWorldPosition(new THREE.Vector3()));
        else refs.camera.lookAt(new THREE.Vector3(0.0, 1.3, 0.0));

        refs.vrmMixer = new THREE.AnimationMixer(vrm.scene);

        if (refs.vrm.expressionManager) {
          refs.vrm.expressionManager.autoUpdate = true; // 自動まばたきを有効化
          
          // ★★★ 2. 'h' (にやり) の設定を削除 ★★★
          // refs.vrm.expressionManager.setValue('h', 1.0); 
        }
        console.log("VRMモデルの読み込みが完了しました。");
      },
      (progress) => console.log(`VRM読み込み中: ${Math.round(100 * progress.loaded / progress.total)}%`),
      (error) => console.error("VRMの読み込みに失敗しました:", error)
    );

    // --- アニメーションループ開始 ---
    refs.clock = new THREE.Clock();
    const animate = () => {
      refs.animationFrameId = requestAnimationFrame(animate);
      const delta = refs.clock.getDelta();

      updateLipSyncAnimation(); // ★ delta は不要

      if (refs.vrmMixer) refs.vrmMixer.update(delta);
      if (refs.vrm) refs.vrm.update(delta); // vrm.update() が表情(autoUpdate)も更新
      
      if (refs.renderer && refs.scene && refs.camera) {
        refs.renderer.render(refs.scene, refs.camera);
      }
    };
    animate();
    
    // --- リサイズ処理 (変更なし) ---
    const onResize = () => {
      if (!refs.renderer || !refs.camera || !container) return;
      const width = container.clientWidth; const height = container.clientHeight;
      refs.renderer.setSize(width, height);
      refs.renderer.setPixelRatio(window.devicePixelRatio);
      refs.camera.aspect = width / height;
      refs.camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    // --- クリーンアップ (変更なし) ---
    return () => {
      window.removeEventListener('resize', onResize);
      if (refs.animationFrameId) cancelAnimationFrame(refs.animationFrameId);
      if (refs.renderer) refs.renderer.dispose();
      if (refs.audioContext) refs.audioContext.close();
    };
  }, []);

  // ★★★ 3. AudioContext初期化時に AnalyserNode も作成 ★★★
  const initAudioContextForLipSync = () => {
    const refs = threeObjects.current;
    if (refs.audioContext) {
      if (refs.audioContext.state === 'suspended') refs.audioContext.resume();
      return true;
    }
    try {
      refs.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      if (refs.audioContext.state === 'suspended') refs.audioContext.resume();
      
      // ★ AnalyserNode を作成・設定
      refs.analyser = refs.audioContext.createAnalyser();
      refs.analyser.fftSize = ANALYSER_FFT_SIZE; // ★
      refs.analyser.smoothingTimeConstant = 0.5;
      console.log("AudioContext と AnalyserNode を初期化しました。");
      
      return true;
    } catch (e) {
      console.error("AudioContextまたはAnalyserNodeの初期化に失敗:", e);
      return false;
    }
  };

  // 3. 親への関数公開 (変更なし)
  useImperativeHandle(ref, () => ({
    startAudioContext: () => {
      return initAudioContextForLipSync();
    }
  }));

  // ★★★ 4. 音声再生時に AnalyserNode に接続 ★★★
  useEffect(() => {
    if (!audioData) return;
    const refs = threeObjects.current;
    if (!initAudioContextForLipSync() || !refs.analyser) {
        console.error("AudioContextまたはAnalyserが未初期化です。");
        return;
    }

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

        refs.audioBufferSource.connect(refs.analyser); // ソース -> アナライザー
        refs.analyser.connect(refs.audioContext.destination); // アナライザー -> スピーカー

        refs.audioBufferSource.onended = () => {
          if (refs.vrm?.expressionManager) refs.vrm.expressionManager.setValue('ou', 0);
          refs.audioBufferSource = null;
        };
        
        refs.audioBufferSource.start(0);
      } catch (e) {
        console.error("音声のデコードまたは再生に失敗しました:", e);
        if (refs.vrm?.expressionManager) refs.vrm.expressionManager.setValue('ou', 0);
        refs.audioBufferSource = null;
      }
    };
    play();
  }, [audioData]);

  // ★★★ 5. 口パクアニメーションを「音量連動 (RMS方式)」に変更 ★★★
  const updateLipSyncAnimation = () => {
    const refs = threeObjects.current;
    
    if (!refs.vrm?.expressionManager || !refs.analyser || !refs.audioBufferSource) {
      // 再生中でなければ、口の形 ('ou') を 0 に戻す
      if (refs.vrm?.expressionManager && refs.vrm.expressionManager.getValue('ou') > 0) {
        refs.vrm.expressionManager.setValue('ou', 0);
      }
      return;
    }

    // --- ★ 新しい音量取得ロジック (RMS) ★ ---
    refs.analyser.getByteTimeDomainData(refs.timeDomainData); // ★ Uint8Array を使用

    let sumOfSquares = 0.0;
    for (let i = 0; i < ANALYSER_FFT_SIZE; i++) {
      // Byte data (0-255) を -1.0 〜 1.0 に正規化
      const norm = (refs.timeDomainData[i] / 128.0) - 1.0;
      sumOfSquares += norm * norm;
    }
    // RMS (二乗平均平方根) を計算して音量とする
    const volume = Math.sqrt(sumOfSquares / ANALYSER_FFT_SIZE);
    // --- ★ ロジックここまで ★ ---
    
    // RMS (0.0〜0.7程度) を 0.0〜1.0 の口の開きにマッピング
    // (係数 5.0 はお好みで調整)
    let lipWeight = volume * 5.0; 

    // 0.0〜1.0 の範囲に収める (クリップ)
    lipWeight = Math.max(0.0, Math.min(1.0, lipWeight));

    // ノイズカット (小さい音は 0 にする)
    if (lipWeight < 0.1) lipWeight = 0.0;

    // 'ou' (VRoid標準の「お」) を動かす
    refs.vrm.expressionManager.setValue('ou', lipWeight);
    
    // (メモ: もし 'aa' ("あ") の方が自然なら 'ou' の代わりに 'aa' を使う)
    // refs.vrm.expressionManager.setValue('aa', lipWeight);
  };
  
  // ★★★ 6. 表情制御 (expressionName) は一時的にコメントアウト ★★★
  // (口パクの問題を先に解決するため)
  /*
  useEffect(() => {
    const refs = threeObjects.current;
    if (!refs.vrm || !refs.vrm.expressionManager) return;
    const mainExpressions = [
        'happy', 'sad', 'angry', 'relaxed', 'surprised', 'neutral',
        'joy', 'sorrow', 'fun', 
        'aa', 'ih', 'uu', 'ee', 'oh', 
        'blinkLeft', 'blinkRight'
    ];
    try {
        mainExpressions.forEach(preset => {
            if (refs.vrm.expressionManager.getExpression(preset)) {
                refs.vrm.expressionManager.setValue(preset, 0);
            }
        });
        if (expressionName) {
            console.log(`VrmViewer: 表情を '${expressionName}' に変更します。`);
            if (refs.vrm.expressionManager.getExpression(expressionName)) {
                refs.vrm.expressionManager.setValue(expressionName, 1.0);
            } else {
                console.warn(`VrmViewer: 表情 '${expressionName}' はモデルに存在しません。`);
            }
        }
    } catch (e) { console.error(`VrmViewer: 表情 '${expressionName || 'reset'}' の設定に失敗しました:`, e); }
  }, [expressionName]); 
  */

  // --- JSX (レンダリング) (変更なし) ---
  return (
    <div id="vrm-canvas-container" ref={containerRef}>
      <canvas id="vrm-canvas" ref={canvasRef}></canvas>
    </div>
  );
});

export default VrmViewer;