import { Engine } from "../engine";
import { ComponentFactory } from "./component_factory";
import { setDOMStyle } from "./dom_utils";

interface Constraints {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class ComponentView {
  htmlElement: HTMLElement;
  superview?: ComponentView;
  subviews: ComponentView[] = [];
  factory!: ComponentFactory;
  engine!: Engine;
  hashCode!: number;
  attributes: any;
  constraints?: Constraints;
  additionalConstraints: any;

  ancestors: AncestorView[] = [];
  ancestorStyle: any = {};

  constructor(readonly document: Document) {
    this.htmlElement = document.createElement(this.elementType());
  }

  elementType(): string {
    return "div";
  }

  setConstraints(constraints?: Constraints) {
    if (!constraints) return;
    this.constraints = constraints;
    this.updateLayout();
  }

  updateLayout() {
    if (!this.constraints) return;
    let x: number = this.constraints.x;
    let y: number = this.constraints.y;
    let w: number = this.constraints.w;
    let h: number = this.constraints.h;
    this.ancestors.forEach((it) => {
      if (it.constraints) {
        x += it.constraints.x;
        y += it.constraints.y;
      }
    });
    setDOMStyle(this.htmlElement, {
      position: this.additionalConstraints?.position ?? "absolute",
      left: this.additionalConstraints?.left ?? x + "px",
      top: this.additionalConstraints?.top ?? y + "px",
      width: this.additionalConstraints?.width ?? w + "px",
      height: this.additionalConstraints?.height ?? h + "px",
    });
  }

  setAttributes(attributes: any) {
    this.attributes = attributes;
  }

  setChildren(children: any) {
    if (!(children instanceof Array)) {
      return;
    }
    let makeSubviews = children
      .map((it) => this.factory.create(it, this.document))
      .filter((it) => it);
    let changed = false;
    if (makeSubviews.length !== this.subviews.length) {
      changed = true;
    } else {
      let allSame = makeSubviews.every((it, idx) => {
        return it === this.subviews[idx] && it.superview === this;
      });
      if (!allSame) {
        changed = true;
      }
    }
    if (changed) {
      this.removeAllSubviews();
      makeSubviews.forEach((it) => this.addSubview(it!));
    }
  }

  resetAncestorStyle() {
    if (this.ancestorStyle.opacity) {
      this.ancestorStyle.opacity = 1.0;
    }
    if (this.ancestorStyle.borderRadius) {
      this.ancestorStyle.borderRadius = "unset";
    }
    if (this.ancestorStyle.overflow) {
      this.ancestorStyle.overflow = "unset";
    }
    if (this.ancestorStyle.borderTopLeftRadius) {
      this.ancestorStyle.borderTopLeftRadius = "unset";
    }
    if (this.ancestorStyle.borderTopRightRadius) {
      this.ancestorStyle.borderTopRightRadius = "unset";
    }
    if (this.ancestorStyle.borderBottomLeftRadius) {
      this.ancestorStyle.borderBottomLeftRadius = "unset";
    }
    if (this.ancestorStyle.borderBottomRightRadius) {
      this.ancestorStyle.borderBottomRightRadius = "unset";
    }
  }

  setAncestors(ancestors: any) {
    if (!(ancestors instanceof Array) && this.ancestors.length > 0) {
      this.resetAncestorStyle();
      this.ancestors = [];
      setDOMStyle(this.htmlElement, this.ancestorStyle);
    } else {
      this.resetAncestorStyle();
      this.ancestors = ancestors
        .map((it: any) => this.factory.createAncestors(it, this))
        .filter((it: any) => it) as AncestorView[];
      setDOMStyle(this.htmlElement, this.ancestorStyle);
    }
  }

  removeAllSubviews() {
    this.subviews.forEach((it) => {
      it.superview = undefined;
      it.htmlElement.remove();
    });
    this.subviews = [];
  }

  removeFromSuperview() {
    if (!this.superview) return;
    const index = this.superview.subviews.indexOf(this);
    if (index >= 0) {
      this.superview.subviews = this.superview?.subviews.splice(index, 1);
    }
    this.htmlElement.remove();
  }

  addSubview(view: ComponentView) {
    if (view.superview) {
      view.removeFromSuperview();
    }
    this.subviews.push(view);
    view.superview = this;
    this.htmlElement.appendChild(view.htmlElement);
  }
}

export class AncestorView {
  constraints?: Constraints;

  constructor(public target: ComponentView) {}

  setConstraints(constraints?: Constraints) {
    if (!constraints) return;
    this.constraints = constraints;
    this.target.updateLayout();
  }

  setAttributes(attributes: any) {}
}
