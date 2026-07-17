import * as THREE from 'three';

export interface MotionState {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
}

export interface PhysicsConfig {
  gravity: number;
  damping: number;
  mass: number;
  hoverHeight: number;
  hoverSpeed: number;
  hoverAmplitude: number;
  headLagFactor: number;
  breathingAmplitude: number;
  breathingSpeed: number;
  bobSpeed: number;
}

export class MotionPhysicsEngine {
  private motionState: MotionState;
  private config: PhysicsConfig;
  private time: number = 0;
  private targetRotation: THREE.Euler;
  private mousePosition: { x: number; y: number } = { x: 0, y: 0 };

  constructor(initialPosition = new THREE.Vector3(0, 0, 0)) {
    this.motionState = {
      position: initialPosition.clone(),
      rotation: new THREE.Euler(0, 0, 0),
      velocity: new THREE.Vector3(0, 0, 0),
      angularVelocity: new THREE.Vector3(0, 0, 0),
    };

    this.targetRotation = new THREE.Euler(0, 0, 0);

    this.config = {
      gravity: -0.098, // Natural gravity in m/s²
      damping: 0.95,
      mass: 1.0,
      hoverHeight: 0.05,
      hoverSpeed: 0.002,
      hoverAmplitude: 0.03,
      headLagFactor: 0.08,
      breathingAmplitude: 0.02,
      breathingSpeed: 0.0015,
      bobSpeed: 0.001,
    };
  }

  setMousePosition(x: number, y: number): void {
    this.mousePosition = { x, y };
  }

  // Simulate one frame of physics (delta in seconds)
  update(deltaTime: number): MotionState {
    this.time += deltaTime;

    // Apply hovering motion
    this.applyHoveringMotion();

    // Apply breathing animation
    this.applyBreathingMotion();

    // Apply head lag (secondary motion)
    this.applyHeadLag();

    // Apply eye tracking
    this.applyEyeTracking();

    // Damping
    this.motionState.velocity.multiplyScalar(this.config.damping);
    this.motionState.angularVelocity.multiplyScalar(this.config.damping);

    // Update position
    this.motionState.position.add(
      this.motionState.velocity.clone().multiplyScalar(deltaTime),
    );

    // Update rotation
    const angularDisplacement = this.motionState.angularVelocity.clone().multiplyScalar(deltaTime);
    const euler = new THREE.Euler(
      this.motionState.rotation.x + angularDisplacement.x,
      this.motionState.rotation.y + angularDisplacement.y,
      this.motionState.rotation.z + angularDisplacement.z,
      'YXZ',
    );
    this.motionState.rotation = euler;

    return this.motionState;
  }

  private applyHoveringMotion(): void {
    // Smooth hovering up and down
    const hoverOffset = Math.sin(this.time * this.config.hoverSpeed) * this.config.hoverAmplitude;
    this.motionState.position.y = hoverOffset;

    // Gentle bobbing side-to-side
    const bobOffset = Math.cos(this.time * this.config.bobSpeed) * 0.01;
    this.motionState.position.x += (bobOffset - this.motionState.position.x * 0.1) * 0.05;
  }

  private applyBreathingMotion(): void {
    // Subtle chest/body breathing expansion
    const breathingScale = 1.0 + Math.sin(this.time * this.config.breathingSpeed) * this.config.breathingAmplitude;

    // This would be applied to the mesh scale in the render loop
    // We'll store it as a property
    (this as any).breathingScale = breathingScale;
  }

  private applyHeadLag(): void {
    // Secondary motion: head follows body with lag
    // Creates natural inertia effect

    const maxHeadRotation = 0.3; // radians
    this.targetRotation.x = this.mousePosition.y * 0.2; // Clamp to max
    this.targetRotation.y = this.mousePosition.x * 0.2;
    this.targetRotation.z = 0;

    // Smooth interpolation with lag
    this.motionState.rotation.x += (this.targetRotation.x - this.motionState.rotation.x) * this.config.headLagFactor;
    this.motionState.rotation.y += (this.targetRotation.y - this.motionState.rotation.y) * this.config.headLagFactor;

    // Clamp to reasonable values
    this.motionState.rotation.x = Math.max(-maxHeadRotation, Math.min(maxHeadRotation, this.motionState.rotation.x));
    this.motionState.rotation.y = Math.max(-maxHeadRotation, Math.min(maxHeadRotation, this.motionState.rotation.y));
  }

  private applyEyeTracking(): void {
    // Eyes follow mouse/camera direction for life-like interaction
    // This is applied separately in the render loop using mouse position
    (this as any).eyeTrackX = Math.max(-0.3, Math.min(0.3, this.mousePosition.x * 0.1));
    (this as any).eyeTrackY = Math.max(-0.3, Math.min(0.3, this.mousePosition.y * 0.1));
  }

  // Apply momentum to the robot (e.g., from gestures)
  applyForce(force: THREE.Vector3): void {
    const acceleration = force.clone().multiplyScalar(1 / this.config.mass);
    this.motionState.velocity.add(acceleration);
  }

  // Apply rotational momentum
  applyTorque(torque: THREE.Vector3): void {
    const angularAcceleration = torque.clone().multiplyScalar(1 / this.config.mass);
    this.motionState.angularVelocity.add(angularAcceleration);
  }

  // Get breathing scale for mesh scale animation
  getBreathingScale(): number {
    return (this as any).breathingScale || 1.0;
  }

  // Get eye tracking values for eye animation
  getEyeTracking(): { x: number; y: number } {
    return {
      x: (this as any).eyeTrackX || 0,
      y: (this as any).eyeTrackY || 0,
    };
  }

  // Blinking animation (random intervals)
  getBlinkFactor(): number {
    // Random blink ~every 5 seconds on average
    const blinkCycle = 5000; // 5 seconds
    const blinkPhase = (this.time * 1000) % blinkCycle;
    const blinkTiming = Math.random() * blinkCycle;

    if (Math.abs(blinkPhase - blinkTiming) < 150) {
      // 150ms blink duration
      const blinkProgress = (Math.abs(blinkPhase - blinkTiming) / 75 - 1) ** 2; // Ease in-out
      return Math.max(0, 1 - blinkProgress);
    }

    return 1.0; // Eyes open
  }

  resetMotion(): void {
    this.motionState.velocity.set(0, 0, 0);
    this.motionState.angularVelocity.set(0, 0, 0);
  }

  getMotionState(): MotionState {
    return {
      position: this.motionState.position.clone(),
      rotation: new THREE.Euler(
        this.motionState.rotation.x,
        this.motionState.rotation.y,
        this.motionState.rotation.z,
      ),
      velocity: this.motionState.velocity.clone(),
      angularVelocity: this.motionState.angularVelocity.clone(),
    };
  }

  setConfig(partialConfig: Partial<PhysicsConfig>): void {
    this.config = { ...this.config, ...partialConfig };
  }

  getConfig(): PhysicsConfig {
    return { ...this.config };
  }
}

export const motionPhysicsEngine = new MotionPhysicsEngine();
