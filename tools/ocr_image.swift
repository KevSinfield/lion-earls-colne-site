// Reads the text in a menu picture using macOS's built-in Vision OCR, one line per row, top to bottom.
// Used by tools/check_menu.py to double-check a menu we only have as a picture. Mac only.
// Run: swift tools/ocr_image.swift picture.jpg
import Foundation
import Vision
import AppKit

guard CommandLine.arguments.count > 1,
      let img = NSImage(contentsOfFile: CommandLine.arguments[1]),
      let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    FileHandle.standardError.write("cannot read image\n".data(using: .utf8)!)
    exit(1)
}
let req = VNRecognizeTextRequest()
req.recognitionLevel = .accurate
req.usesLanguageCorrection = true
try VNImageRequestHandler(cgImage: cg, options: [:]).perform([req])
let obs = (req.results ?? []).sorted {
    // top of the page first (Vision's y runs bottom to top), then left to right
    abs($0.boundingBox.midY - $1.boundingBox.midY) > 0.01 ? $0.boundingBox.midY > $1.boundingBox.midY : $0.boundingBox.minX < $1.boundingBox.minX
}
for o in obs { if let t = o.topCandidates(1).first?.string { print(t) } }
