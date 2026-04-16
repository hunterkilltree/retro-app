package com.retro.service;

import com.itextpdf.io.font.constants.StandardFonts;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Div;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.UnitValue;
import com.retro.entity.ActionItem;
import com.retro.entity.BoardColumn;
import com.retro.entity.Note;
import com.retro.entity.NoteGroup;
import com.retro.entity.Room;
import com.retro.repository.ActionItemRepository;
import com.retro.repository.BoardColumnRepository;
import com.retro.repository.NoteGroupRepository;
import com.retro.repository.NoteRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class PdfExportService {

    private static final DeviceRgb ACCENT  = new DeviceRgb(90, 72, 212);
    private static final DeviceRgb MUTED   = new DeviceRgb(130, 120, 110);
    private static final DeviceRgb BG_CARD = new DeviceRgb(248, 244, 236);

    private final BoardColumnRepository boardColumnRepository;
    private final NoteRepository noteRepository;
    private final NoteGroupRepository noteGroupRepository;
    private final ActionItemRepository actionItemRepository;

    public PdfExportService(
            BoardColumnRepository boardColumnRepository,
            NoteRepository noteRepository,
            NoteGroupRepository noteGroupRepository,
            ActionItemRepository actionItemRepository
    ) {
        this.boardColumnRepository = boardColumnRepository;
        this.noteRepository = noteRepository;
        this.noteGroupRepository = noteGroupRepository;
        this.actionItemRepository = actionItemRepository;
    }

    @Transactional(readOnly = true)
    public byte[] export(Room room) throws IOException {
        List<BoardColumn> columns = boardColumnRepository.findByRoomOrderByPosition(room);
        List<Note>        notes   = noteRepository.findSnapshotNotesByRoom(room);
        List<NoteGroup>   groups  = noteGroupRepository.findSnapshotGroupsByRoom(room);
        List<ActionItem>  actions = actionItemRepository.findByRoomOrderByPosition(room);

        ByteArrayOutputStream out = new ByteArrayOutputStream();

        PdfFont bold   = PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);
        PdfFont normal = PdfFontFactory.createFont(StandardFonts.HELVETICA);

        PdfDocument pdf = new PdfDocument(new PdfWriter(out));
        Document doc = new Document(pdf, PageSize.A4);
        doc.setMargins(40, 40, 40, 40);
        doc.setFont(normal);

        // ── Title ──────────────────────────────────────────────────────────────
        doc.add(new Paragraph("Retrospective — " + room.getRoomCode())
                .setFont(bold).setFontSize(20).setFontColor(ACCENT)
                .setMarginBottom(4));
        doc.add(new Paragraph(LocalDate.now().toString())
                .setFontSize(10).setFontColor(MUTED).setMarginBottom(20));

        // ── Columns ────────────────────────────────────────────────────────────
        for (BoardColumn col : columns) {
            List<Note> colNotes = notes.stream()
                    .filter(n -> n.getColumn().getId().equals(col.getId()))
                    .collect(Collectors.toList());
            List<NoteGroup> colGroups = groups.stream()
                    .filter(g -> g.getColumn().getId().equals(col.getId()))
                    .collect(Collectors.toList());

            // Column heading
            doc.add(new Paragraph(col.getTitle().toUpperCase())
                    .setFont(bold).setFontSize(11).setFontColor(ACCENT)
                    .setBorderBottom(new SolidBorder(ACCENT, 1f))
                    .setMarginBottom(8).setMarginTop(16));

            // Groups
            for (NoteGroup group : colGroups) {
                String label = group.getName() != null ? group.getName() : "Group";
                doc.add(new Paragraph("▸ " + label)
                        .setFont(bold).setFontSize(9).setFontColor(ACCENT)
                        .setMarginBottom(4).setMarginTop(8));

                List<Note> groupNotes = colNotes.stream()
                        .filter(n -> group.getId().equals(n.getGroup() != null ? n.getGroup().getId() : null))
                        .collect(Collectors.toList());
                for (Note note : groupNotes) {
                    doc.add(noteCard(note, normal, bold, true));
                }
            }

            // Ungrouped
            List<Note> ungrouped = colNotes.stream()
                    .filter(n -> n.getGroup() == null)
                    .collect(Collectors.toList());
            for (Note note : ungrouped) {
                doc.add(noteCard(note, normal, bold, false));
            }

            if (colNotes.isEmpty()) {
                doc.add(new Paragraph("No notes").setFontSize(9).setFontColor(MUTED).setMarginBottom(4));
            }
        }

        // ── Action Items ───────────────────────────────────────────────────────
        if (!actions.isEmpty()) {
            doc.add(new Paragraph("ACTION ITEMS")
                    .setFont(bold).setFontSize(11).setFontColor(ACCENT)
                    .setBorderBottom(new SolidBorder(ACCENT, 1f))
                    .setMarginTop(24).setMarginBottom(8));

            for (int i = 0; i < actions.size(); i++) {
                ActionItem item = actions.get(i);
                doc.add(new Paragraph((i + 1) + ".  " + item.getContent())
                        .setFontSize(10).setMarginBottom(5).setFirstLineIndent(0));
            }
        }

        doc.close();
        return out.toByteArray();
    }

    private Div noteCard(Note note, PdfFont normal, PdfFont bold, boolean indented) {
        String author = note.getParticipant().getUsername();
        Div card = new Div()
                .setBackgroundColor(BG_CARD)
                .setBorderRadius(new com.itextpdf.layout.properties.BorderRadius(4))
                .setPadding(7)
                .setMarginBottom(5)
                .setMarginLeft(indented ? 12 : 0);

        card.add(new Paragraph(note.getContent())
                .setFont(normal).setFontSize(9.5f).setMarginBottom(2).setMultipliedLeading(1.3f));
        card.add(new Paragraph("— " + author)
                .setFont(bold).setFontSize(8).setFontColor(MUTED).setMarginBottom(0));
        return card;
    }
}
