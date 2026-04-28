import { jsPDF } from 'jspdf';
import type { RangeRecord } from '../types';
import { getPhotoPublicUrl } from '../lib/apiClient';

interface ExportOptions {
  record: RangeRecord;
  shooterName?: string;
}

export async function exportRecordToPDF({ record, shooterName }: ExportOptions) {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let yPosition = margin;

  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Range Record', margin, yPosition);
  yPosition += 10;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text(`Date: ${record.record_date}`, margin, yPosition);
  yPosition += 5;

  if (shooterName) {
    pdf.text(`Shooter: ${shooterName}`, margin, yPosition);
    yPosition += 5;
  }

  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  const addField = (label: string, value: string | null | undefined) => {
    if (!value) return;

    if (yPosition > pageHeight - 30) {
      pdf.addPage();
      yPosition = margin;
    }

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(60, 60, 60);
    pdf.text(label, margin, yPosition);

    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);

    const lines = pdf.splitTextToSize(value, contentWidth - 60);
    pdf.text(lines, margin + 60, yPosition);

    yPosition += Math.max(5, lines.length * 4);
  };

  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('Session Details', margin, yPosition);
  yPosition += 8;

  addField('Range Location:', record.range_location);
  addField('Range Type:', record.range_type);
  addField('Practice Type:', record.practice_type);
  addField('Target Type:', record.target_type);
  addField('Target Distance:', record.target_distance);
  addField('Shooting Position:', record.shooting_position);

  if (yPosition > pageHeight - 30) {
    pdf.addPage();
    yPosition = margin;
  } else {
    yPosition += 5;
  }

  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Equipment', margin, yPosition);
  yPosition += 8;

  addField('Firearm Type:', record.firearm_type);
  addField('Firearm Model:', record.firearm_model);
  addField('Ammunition:', record.ammunition);

  if (yPosition > pageHeight - 30) {
    pdf.addPage();
    yPosition = margin;
  } else {
    yPosition += 5;
  }

  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Conditions', margin, yPosition);
  yPosition += 8;

  addField('Weather:', record.weather);
  addField('Conditions:', record.conditions);

  const photosAndNotes: Array<{ photoUrl: string; notes: string; number: number; rotation: number }> = [];
  for (let i = 1; i <= 13; i++) {
    const rawUrl = record[`photo_${i}_url` as keyof RangeRecord] as string;
    const photoUrl = rawUrl ? getPhotoPublicUrl(rawUrl) : '';
    const notes = record[`notes_${i}` as keyof RangeRecord] as string;
    const rotation = (record[`photo_${i}_rotation` as keyof RangeRecord] as number) || 0;
    if (photoUrl || notes) {
      photosAndNotes.push({ photoUrl, notes, number: i, rotation });
    }
  }

  if (photosAndNotes.length > 0) {
    if (yPosition > pageHeight - 30) {
      pdf.addPage();
      yPosition = margin;
    } else {
      yPosition += 5;
    }

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Photos & Notes', margin, yPosition);
    yPosition += 8;

    for (const item of photosAndNotes) {
      const photoColumnWidth = 80;
      const notesColumnX = margin + photoColumnWidth + 10;
      const notesColumnWidth = contentWidth - photoColumnWidth - 10;

      let itemHeight = 0;
      let imgHeight = 0;
      let notesHeight = 0;
      let imageData: { dataUrl: string; width: number; height: number } | null = null;

      if (item.photoUrl) {
        try {
          imageData = await getOrientedImageData(item.photoUrl, item.rotation);
          const imgWidth = photoColumnWidth;
          imgHeight = (imageData.height / imageData.width) * imgWidth;
        } catch (error) {
          imgHeight = 10;
        }
      }

      if (item.notes) {
        pdf.setFontSize(9);
        const notesLines = pdf.splitTextToSize(item.notes, notesColumnWidth);
        notesHeight = notesLines.length * 4;
      }

      itemHeight = Math.max(imgHeight, notesHeight) + 16;

      if (yPosition + itemHeight > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text(`Photo ${item.number}`, margin, yPosition);
      yPosition += 6;

      const contentStartY = yPosition;

      if (item.photoUrl && imageData) {
        const imgWidth = photoColumnWidth;
        const calculatedImgHeight = (imageData.height / imageData.width) * imgWidth;
        pdf.addImage(imageData.dataUrl, 'JPEG', margin, yPosition, imgWidth, calculatedImgHeight);
      } else if (item.photoUrl) {
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'italic');
        pdf.setTextColor(150, 150, 150);
        pdf.text('[Image could not be loaded]', margin, yPosition);
      }

      if (item.notes) {
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(0, 0, 0);
        const notesLines = pdf.splitTextToSize(item.notes, notesColumnWidth);
        pdf.text(notesLines, notesColumnX, contentStartY);
      }

      yPosition = contentStartY + Math.max(imgHeight, notesHeight) + 10;
    }
  }

  if (record.additional_notes) {
    if (yPosition > pageHeight - 30) {
      pdf.addPage();
      yPosition = margin;
    } else {
      yPosition += 5;
    }

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Additional Notes', margin, yPosition);
    yPosition += 8;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    const additionalNotesLines = pdf.splitTextToSize(record.additional_notes, contentWidth);
    pdf.text(additionalNotesLines, margin, yPosition);
  }

  const fileName = `range-record-${record.record_date}.pdf`;
  pdf.save(fileName);
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function getOrientedImageData(url: string, rotation = 0): Promise<{ dataUrl: string; width: number; height: number }> {
  const img = await loadImage(url);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  const isTransposed = rotation === 90 || rotation === 270;
  canvas.width = isTransposed ? img.height : img.width;
  canvas.height = isTransposed ? img.width : img.height;

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);

  return {
    dataUrl: canvas.toDataURL('image/jpeg', 0.9),
    width: canvas.width,
    height: canvas.height,
  };
}
