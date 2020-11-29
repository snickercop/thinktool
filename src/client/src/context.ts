import {State} from "./data";
import * as T from "./tree";
import {Tree} from "./tree";
import * as Tutorial from "./tutorial";
import {Communication} from "@thinktool/shared";
import {Server} from "./server-api";
import {Storage} from "./storage";
import type {Receiver} from "./receiver";
import type {Message} from "./messages";

export interface DragInfo {
  current: T.NodeRef | null;
  target: T.NodeRef | null;
  finished: boolean | "copy";
}

export interface ActiveEditor {
  selection: string;
  replaceSelectionWithLink(target: string, textContent: string): void;
}

export interface AppState {
  state: State;
  tutorialState: Tutorial.State;
  changelogShown: boolean;
  changelog: Communication.Changelog | "loading";
  tree: Tree;
  drag: DragInfo;
  selectedThing: string;
}

export interface Context extends AppState {
  storage: Storage;
  server?: Server;

  state: State;
  setState(value: State): void;
  setLocalState(value: State): void;
  updateLocalState(f: (value: State) => State): void;

  tutorialState: Tutorial.State;
  setTutorialState(tutorialState: Tutorial.State): void;

  changelogShown: boolean;
  setChangelogShown(changelogShown: boolean): void;
  changelog: Communication.Changelog | "loading";

  undo(): void;

  tree: Tree;
  setTree(value: Tree): void;

  drag: DragInfo;
  setDrag(value: DragInfo): void;

  selectedThing: string;
  setSelectedThing(value: string): void;

  activePopup: ((state: State, tree: Tree, target: T.NodeRef, selection: string) => [State, Tree] | void) | null;
  setActivePopup(
    callback: ((state: State, tree: Tree, target: T.NodeRef, selection: string) => [State, Tree] | void) | null,
  ): void;
  popupTarget: T.NodeRef | null;
  setPopupTarget(popupTarget: T.NodeRef | null): void;

  activeEditor: ActiveEditor | null;
  registerActiveEditor(activeEditor: ActiveEditor | null): void;

  openExternalUrl(url: string): void;

  send: Receiver<Message>["send"];
}
