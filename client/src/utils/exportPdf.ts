import jsPDF from 'jspdf';
import type { Book, Quote } from '../types';

// Colors matching the app theme
const ACCENT = [139, 105, 20] as const;     // #8B6914
const CHARCOAL = [44, 44, 44] as const;     // #2C2C2C
const MUTED = [120, 113, 108] as const;     // stone-500
const LIGHT_RULE = [214, 211, 205] as const; // stone-300

const PAGE_WIDTH = 210; // A4 mm
const MARGIN = 25;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;
const PAGE_HEIGHT = 297;
const FOOTER_Y = PAGE_HEIGHT - 15;

function addFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(`${pageNum} / ${totalPages}`, PAGE_WIDTH / 2, FOOTER_Y, { align: 'center' });
}

function addPageFooters(doc: jsPDF) {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    addFooter(doc, i, total);
  }
}

export function exportQuotesPdf(book: Book, quotes: Quote[]): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const bottomLimit = FOOTER_Y - 10;
  let y = MARGIN;

  // ── Title ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...CHARCOAL);
  const titleLines = doc.splitTextToSize(book.title, CONTENT_WIDTH);
  doc.text(titleLines, MARGIN, y);
  y += titleLines.length * 9;

  // ── Author ──
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(12);
  doc.setTextColor(...MUTED);
  doc.text(`by ${book.author}`, MARGIN, y);
  y += 6;

  // ── Quote count ──
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`${quotes.length} quotes`, MARGIN, y);
  y += 4;

  // ── Divider ──
  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, y, MARGIN + 40, y);
  y += 12;

  // ── Quotes ──
  quotes.forEach((quote, idx) => {
    const quoteText = `\u201C${quote.quote_text}\u201D`;

    // Measure quote height to decide if we need a new page
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    const textLines = doc.splitTextToSize(quoteText, CONTENT_WIDTH - 8);
    const quoteHeight = textLines.length * 4.5 + 14; // text + attribution + spacing

    if (y + quoteHeight > bottomLimit) {
      doc.addPage();
      y = MARGIN;
    }

    // Accent bar
    doc.setDrawColor(...ACCENT);
    doc.setLineWidth(0.8);
    doc.line(MARGIN, y - 1, MARGIN, y + textLines.length * 4.5 + 2);

    // Quote text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(...CHARCOAL);
    doc.text(textLines, MARGIN + 5, y);
    y += textLines.length * 4.5 + 2;

    // Attribution
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    const attribution = quote.likes_count > 0
      ? `\u2014 ${quote.author}  \u00B7  ${quote.likes_count} likes`
      : `\u2014 ${quote.author}`;
    doc.text(attribution, MARGIN + 5, y);
    y += 10;

    // Light separator between quotes (not after the last one)
    if (idx < quotes.length - 1) {
      doc.setDrawColor(...LIGHT_RULE);
      doc.setLineWidth(0.2);
      doc.line(MARGIN + 5, y - 4, MARGIN + CONTENT_WIDTH / 3, y - 4);
    }
  });

  // Add page numbers to all pages
  addPageFooters(doc);

  // Download
  const safeTitle = book.title.replace(/[^a-zA-Z0-9 ]/g, '').trim();
  doc.save(`${safeTitle} - Quotes.pdf`);
}
