"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import {
  commands,
  languages,
  window,
  CancellationToken,
  ExtensionContext,
  FoldingContext,
  FoldingRange,
  FoldingRangeProvider,
  TextDocument
} from "vscode";

import { range } from "rxjs";
import {
  bufferCount,
  filter,
  map,
  scan,
  startWith,
  tap,
  endWith
} from "rxjs/operators";

// t
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "deckset" is now active!');

  languages.registerFoldingRangeProvider(
    { scheme: "file", language: "markdown" },
    new MyFoldingRangeProvider()
  );

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with  registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = commands.registerCommand("deckset.sayHello", () => {
    // The code you place here will be executed every time your command is executed

    // Display a message box to the user
    window.showInformationMessage("Hello World!");
  });

  context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}

// TODO move to own class
class MyFoldingRangeProvider implements FoldingRangeProvider {
  provideFoldingRanges(
    document: TextDocument,
    context: FoldingContext,
    token: CancellationToken
  ): FoldingRange[] {
    let ranges: FoldingRange[] = [];

    let slideDivides = range(0, document.lineCount).pipe(
      map(lineNum => {
        const textLine = document.lineAt(lineNum);
        const { text } = textLine;
        return {
          line: lineNum,
          text,
          dropping: false,
          drop: false,
          startsSlide: false
        };
      }),
      scan((prev, current) => {
        const startsComment = current.text === "<!--";
        const endsComment = current.text === "-->";
        const startsSlide = current.text === "---";

        return {
          line: current.line,
          text: current.text,
          dropping: startsComment || (prev.dropping && !endsComment),
          drop: startsComment || prev.dropping,
          startsSlide
        };
      }),
      filter(line => !line.drop),
      filter(line => line.startsSlide),
      map(line => line.line),
      startWith(0),
      endWith(document.lineCount - 1),
      bufferCount(2, 1),
      tap(x => console.log(x))
    );

    slideDivides.subscribe(divides => {
      // These ts-ignores are because bufferCount
      // returns some crap type information - it doesn't know that
      // after bufferCount(2,1), emitted items are Array of Number,
      // not number anymore
      // @ts-ignore
      ranges = divides
        // @ts-ignore
        .filter(d => d.length > 1)
        // @ts-ignore
        .map(([start, end]) => new FoldingRange(start, end));
    });

    return ranges;
  }
}
