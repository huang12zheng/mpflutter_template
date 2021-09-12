declare var require: any;
declare var global: any;
declare var wx: any;

import { BrowserApp, WXApp } from "./app";
import { MPDrawable } from "./components/basic/custom_paint";
import { WebDialogs } from "./components/basic/web_dialogs";
import { ComponentFactory } from "./components/component_factory";
import { MPPlatformView } from "./components/mpkit/platform_view";
import { MPScaffold } from "./components/mpkit/scaffold";
import { createDebugger, Debugger } from "./debugger/debugger";
import { MPEnv, PlatformType } from "./env";
import { MethodChannelHandler } from "./mpjs/method_channel_handler";
import { MPJS } from "./mpjs/mpjs";
import { Page } from "./page";
import { BrowserRouter, Router } from "./router";
import { TextMeasurer } from "./text_measurer";
import { WindowInfo } from "./window_info";
import { wrapDartObject } from "./components/dart_object";

try {
  let self = window ?? global;
  (self as any).mpDEBUG = (self as any).mpDEBUG ?? false;
} catch (error) {}

export class Engine {
  private started: boolean = false;
  private codeBlock?: () => void;
  debugger?: Debugger;
  private messageQueue: string[] = [];
  drawable: MPDrawable;
  componentFactory: ComponentFactory;
  managedViews: { [key: number]: Page } = {};
  unmanagedViewFrameData: { [key: number]: any[] } = {};
  mpJS: MPJS = new MPJS(this);
  app?: BrowserApp | WXApp;
  router?: Router;
  windowInfo = new WindowInfo(this);
  pageMode: boolean = false;

  constructor() {
    this.componentFactory = new ComponentFactory(this);
    this.drawable = new MPDrawable(this);
    MethodChannelHandler.installHandler();
  }

  public static codeBlockWithCodePath(codePath: string): Promise<() => void> {
    return new Promise((res, rej) => {
      const httpRequest = new XMLHttpRequest();
      httpRequest.onload = () => {
        res(() => {
          eval(httpRequest.response);
        });
      };
      httpRequest.onerror = (error) => {
        rej(error);
      };
      httpRequest.open("GET", codePath);
      httpRequest.send();
    });
  }

  public static codeBlockWithFile(filePath: string): () => void {
    return () => {
      require(filePath).main();
    };
  }

  public static registerPlatformView(
    viewType: string,
    viewClass: typeof MPPlatformView
  ) {
    ComponentFactory.components[viewType] = viewClass;
  }

  public initWithDebuggerServerAddr(debuggerServerAddr: string) {
    this.debugger = createDebugger(debuggerServerAddr, this);
  }

  public initWithCodeBlock(codeBlock: () => void) {
    this.codeBlock = codeBlock;
  }

  public start() {
    if (this.started) return;
    if (!this.codeBlock && !this.debugger) return;
    this.windowInfo.updateWindowInfo();
    this.listenViewport();
    if (self) {
      (self as any).engineScope = this.mpJS.engineScope;
    } else {
      (global as any).self = {
        JSON,
        setTimeout,
        setInterval,
        clearTimeout,
        clearInterval,
        wx,
        Object,
      };
      (global as any).JSON = JSON;
      (global as any).setTimeout = setTimeout;
      (global as any).setInterval = setInterval;
      (global as any).clearTimeout = clearTimeout;
      (global as any).clearInterval = clearInterval;
      (global as any).wx = wx;
      (global as any).Object = Object;
      (global as any).self.engineScope = this.mpJS.engineScope;
    }
    if (this.debugger) {
      this.debugger.start();
    }
    if (this.codeBlock) {
      this.mpJS.engineScope.onMessage = (message: string) => {
        this.didReceivedMessage(message);
      };
      this.mpJS.engineScope.onMapMessage = (message: any) => {
        this.didReceivedMessage(message, true);
      };
      (() => {
        this.codeBlock();
      })();
      this.flushQueueMessage();
    }
    this.started = true;
  }

  sendMessage(message: string) {
    if (((window ?? global) as any)?.mpDEBUG) {
      console.log(new Date().getTime(), "out", JSON.parse(message));
    }
    if (this.debugger) {
      this.debugger.sendMessage(message);
    } else {
      if (this.mpJS.engineScope.postMessage) {
        this.mpJS.engineScope.postMessage(message);
      } else {
        this.messageQueue.push(message);
      }
    }
  }

  flushQueueMessage() {
    if (this.debugger) {
      return;
    } else {
      if (this.mpJS.engineScope.postMessage) {
        this.messageQueue.forEach((it) => {
          this.mpJS.engineScope.postMessage(it);
        });
      }
    }
  }

  didReceivedMessage(message: string, isDartObject: boolean = false) {
    let decodedMessage = isDartObject
      ? wrapDartObject(message)
      : JSON.parse(message);
    if (!decodedMessage) return;
    if (((window ?? global) as any)?.mpDEBUG) {
      console.log(new Date().getTime(), "in", decodedMessage);
    }
    if (decodedMessage.type === "frame_data") {
      this.didReceivedFrameData(decodedMessage.message);
    } else if (decodedMessage.type === "diff_data") {
      this.didReceivedDiffData(decodedMessage.message);
    } else if (decodedMessage.type === "element_gc") {
      if (decodedMessage.message instanceof Array) {
        this.didReceivedElementGC(decodedMessage.message);
      }
    } else if (decodedMessage.type === "decode_drawable") {
      this.drawable.decodeDrawable(decodedMessage.message);
    } else if (decodedMessage.type === "route") {
      (this.app?.router ?? this.router)?.didReceivedRouteData(
        decodedMessage.message
      );
    } else if (decodedMessage.type === "mpjs") {
      this.didReceivedMPJS(decodedMessage);
    } else if (decodedMessage.type === "action:web_dialogs") {
      WebDialogs.receivedWebDialogsMessage(this, decodedMessage.message);
    } else if (decodedMessage.type === "scaffold") {
      this.didReceivedScaffold(decodedMessage.message);
    } else if (
      decodedMessage.type === "rich_text" &&
      decodedMessage.message?.event === "doMeasure"
    ) {
      TextMeasurer.didReceivedDoMeasureData(this, decodedMessage.message);
    } else if (decodedMessage.type === "platform_view") {
      this.didReceivedPlatformView(decodedMessage.message);
    }
  }

  didReceivedFrameData(frameData: { [key: string]: any }) {
    if (!frameData) return;
    const routeId = frameData.routeId;
    if (this.managedViews[routeId] === undefined) {
      if (!this.unmanagedViewFrameData[routeId]) {
        this.unmanagedViewFrameData[routeId] = [];
      }
      this.unmanagedViewFrameData[routeId].push(frameData);
      return;
    }
    if (typeof routeId === "number") {
      this.managedViews[routeId]?.didReceivedFrameData(frameData);
    }
  }

  didReceivedDiffData(frameData: { [key: string]: any }) {
    if (!frameData) return;
    (frameData.diffs as any[]).forEach((it) => {
      this.componentFactory.create(it, undefined!);
      this.componentFactory.createAncestors(it, undefined!);
    });
  }

  didReceivedElementGC(elements: number[]) {
    elements.forEach((it) => {
      delete this.componentFactory.cachedElement[it];
      delete this.componentFactory.cachedView[it];
    });
  }

  didReceivedScaffold(message: any) {
    if (message.event === "onRefreshEnd") {
      let target = this.componentFactory.cachedView[
        message.target
      ] as MPScaffold;
      if (target) {
        target.refreshEndResolver?.(undefined);
        target.refreshEndResolver = undefined;
      }
    } else if (message.event === "onWechatMiniProgramShareAppMessageResolve") {
      let target = this.componentFactory.cachedView[
        message.target
      ] as MPScaffold;
      if (target) {
        target.onWechatMiniProgramShareAppMessageResolver?.(message.params);
        target.onWechatMiniProgramShareAppMessageResolver = undefined;
      }
    }
  }

  didReceivedMPJS(decodedMessage: any) {
    this.mpJS.handleMessage(
      decodedMessage.message,
      (result) => {
        this.sendMessage(
          JSON.stringify({
            type: "mpjs",
            message: {
              requestId: decodedMessage.message.requestId,
              result: result,
            },
          })
        );
      },
      (funcId: string, args: any[]) => {
        this.sendMessage(
          JSON.stringify({
            type: "mpjs",
            message: {
              funcId: funcId,
              arguments: args,
            },
          })
        );
      }
    );
  }

  didReceivedPlatformView(message: any) {
    if (message.event === "methodCall") {
      let target = this.componentFactory.cachedView[
        message.hashCode
      ] as MPPlatformView;
      if (target) {
        target.onMethodCall(message.method, message.params);
      }
    }
  }

  private listenViewport() {
    if (MPEnv.platformType === PlatformType.browser) {
      window.addEventListener("resize", () => {
        this.sendViewportChangeEvent();
      });
    }
  }

  private sendViewportHandler: any;

  private sendViewportChangeEvent() {
    if (this.sendViewportHandler) {
      clearTimeout(this.sendViewportHandler);
    }
    this.sendViewportHandler = setTimeout(() => {
      this.windowInfo.updateWindowInfo();
      (this.app?.router as BrowserRouter)?.history.forEach((it) => {
        it.item.viewportChanged();
      });
      this.sendViewportHandler = undefined;
    }, 32);
  }
}