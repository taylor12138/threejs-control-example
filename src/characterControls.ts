import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { A, D, DIRECTIONS, S, W } from "./utils";

export class CharacterControls {
  model: THREE.Group;
  mixer: THREE.AnimationMixer;
  animationsMap: Map<string, THREE.AnimationAction> = new Map(); // Walk, Run, Idle
  orbitControl: OrbitControls;
  camera: THREE.Camera;

  // state
  toggleRun: boolean = true;
  currentAction: string;

  // temporary data
  walkDirection = new THREE.Vector3();
  rotateAngle = new THREE.Vector3(0, 1, 0);
  rotateQuarternion: THREE.Quaternion = new THREE.Quaternion();
  cameraTarget = new THREE.Vector3();

  // constants
  fadeDuration: number = 0.2;
  runVelocity = 5;
  walkVelocity = 2;

  constructor(
    model: THREE.Group,
    mixer: THREE.AnimationMixer,
    animationsMap: Map<string, THREE.AnimationAction>,
    orbitControl: OrbitControls,
    camera: THREE.Camera,
    currentAction: string
  ) {
    this.model = model;
    this.mixer = mixer;
    this.animationsMap = animationsMap;
    this.currentAction = currentAction;
    //通过遍历得到传入的默认值，将默认动作（动画）初始化
    this.animationsMap.forEach((value, key) => {
      if (key == currentAction) {
        value.play();
      }
    });
    this.orbitControl = orbitControl;
    this.camera = camera;
    this.updateCameraTarget(0, 0);
  }

  //切换奔跑 / 行走模式
  public switchRunToggle() {
    this.toggleRun = !this.toggleRun;
  }

  public update(delta: number, keysPressed: any) {
    // 查看按下的是不是w、a、s、d
    const directionPressed = DIRECTIONS.some((key) => keysPressed[key] == true);

    var play = "";
    if (directionPressed && this.toggleRun) {
      play = "Run";
    } else if (directionPressed) {
      play = "Walk";
    } else {
      play = "Idle";
    }

    //如果当前动画的值和应该运行的动画（play）的值不一样
    if (this.currentAction != play) {
      const toPlay = this.animationsMap.get(play); //得到我们应该运行的动画
      const current = this.animationsMap.get(this.currentAction); //得到我们当前的动画

      current.fadeOut(this.fadeDuration); //切换动画
      toPlay.reset().fadeIn(this.fadeDuration).play();

      this.currentAction = play;
    }
    // 对minxer调用update，保证动画的运行
    this.mixer.update(delta);

    if (this.currentAction == "Run" || this.currentAction == "Walk") {
      /**
       * 根据wasd，改变模型方向
       */
      // atan2 方法返回一个 -pi 到 pi 之间的数值（偏转角度），
      // 表示点(x, y) 对应的偏移角度。这是一个逆时针角度，以弧度为单位，
      // 正X轴和点(x, y) 与原点连线 之间。注意此函数接受的参数：
      // 先传递 y 坐标，然后是 x 坐标。
      var angleYCameraDirection = Math.atan2(
        this.camera.position.x - this.model.position.x,
        this.camera.position.z - this.model.position.z
      );
      // diagonal movement angle offset
      var directionOffset = this.directionOffset(keysPressed);
      // rotate model
      this.rotateQuarternion.setFromAxisAngle(
        this.rotateAngle,
        angleYCameraDirection + directionOffset
      );
      this.model.quaternion.rotateTowards(this.rotateQuarternion, 0.2);

      /**
       * 开始计算运动量
       */
      //getWorldDirection:返回一个能够表示当前摄像机所正视的世界空间方向的Vector3对象
      this.camera.getWorldDirection(this.walkDirection);
      this.walkDirection.y = 0;
      //normalize:将该向量转换为单位向量（unit vector）， 也就是说，将该向量的方向设置为和原向量相同，但是其长度（length）为1。
      this.walkDirection.normalize();
      //.applyAxisAngle:将轴和角度所指定的旋转应用到该向量上。
      this.walkDirection.applyAxisAngle(this.rotateAngle, directionOffset);

      // run/walk velocity
      const velocity =
        this.currentAction == "Run" ? this.runVelocity : this.walkVelocity;

      // move model & camera
      const moveX = this.walkDirection.x * velocity * delta;
      const moveZ = this.walkDirection.z * velocity * delta;
      this.model.position.x += moveX;
      this.model.position.z += moveZ;
      this.updateCameraTarget(moveX, moveZ);
    }
  }
  //让摄像机镜头跟着移动而改变
  private updateCameraTarget(moveX: number, moveZ: number) {
    // move camera
    this.camera.position.x += moveX;
    this.camera.position.z += moveZ;

    // update camera target
    this.cameraTarget.x = this.model.position.x;
    this.cameraTarget.y = this.model.position.y + 1;
    this.cameraTarget.z = this.model.position.z;
    this.orbitControl.target = this.cameraTarget;
  }

  private directionOffset(keysPressed: any) {
    var directionOffset = 0; // w

    if (keysPressed[W]) {
      if (keysPressed[A]) {
        directionOffset = Math.PI / 4; // w+a
      } else if (keysPressed[D]) {
        directionOffset = -Math.PI / 4; // w+d
      }
    } else if (keysPressed[S]) {
      if (keysPressed[A]) {
        directionOffset = Math.PI / 4 + Math.PI / 2; // s+a
      } else if (keysPressed[D]) {
        directionOffset = -Math.PI / 4 - Math.PI / 2; // s+d
      } else {
        directionOffset = Math.PI; // s
      }
    } else if (keysPressed[A]) {
      directionOffset = Math.PI / 2; // a
    } else if (keysPressed[D]) {
      directionOffset = -Math.PI / 2; // d
    }

    return directionOffset;
  }
}
