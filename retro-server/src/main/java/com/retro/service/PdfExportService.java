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
import com.retro.entity.Participant;
import com.retro.entity.Room;
import com.retro.entity.enums.ParticipantRole;
import com.retro.repository.ActionItemRepository;
import com.retro.repository.BoardColumnRepository;
import com.retro.repository.NoteGroupRepository;
import com.retro.repository.NoteRepository;
import com.retro.repository.ParticipantRepository;
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
    private final ParticipantRepository participantRepository;

    public PdfExportService(
            BoardColumnRepository boardColumnRepository,
            NoteRepository noteRepository,
            NoteGroupRepository noteGroupRepository,
            ActionItemRepository actionItemRepository,
            ParticipantRepository participantRepository
    ) {
        this.boardColumnRepository = boardColumnRepository;
        this.noteRepository = noteRepository;
        this.noteGroupRepository = noteGroupRepository;
        this.actionItemRepository = actionItemRepository;
        this.participantRepository = participantRepository;
    }

    @Transactional(readOnly = true)
    public byte[] export(Room room) throws IOException {
        List<BoardColumn>  columns      = boardColumnRepository.findByRoomOrderByPosition(room);
        List<Note>         notes        = noteRepository.findSnapshotNotesByRoom(room);
        List<NoteGroup>    groups       = noteGroupRepository.findSnapshotGroupsByRoom(room);
        List<ActionItem>   actions      = actionItemRepository.findByRoomOrderByPosition(room);
        List<Participant>  participants = participantRepository.findByRoom(room);

        ByteArrayOutputStream out = new ByteArrayOutputStream();

        PdfFont bold   = PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);
        PdfFont normal = PdfFontFactory.createFont(StandardFonts.HELVETICA);

        PdfDocument pdf = new PdfDocument(new PdfWriter(out));
        Document doc = new Document(pdf, PageSize.A4);
        doc.setMargins(40, 40, 40, 40);
        doc.setFont(normal);

        // ── Title ──────────────────────────────────────────────────────────────
        String title = (room.getTitle() != null && !room.getTitle().isBlank())
                ? room.getTitle()
                : "Retrospective";
        doc.add(new Paragraph(title)
                .setFont(bold).setFontSize(20).setFontColor(ACCENT)
                .setMarginBottom(4));
        doc.add(new Paragraph("Retrospective · " + LocalDate.now())
                .setFontSize(10).setFontColor(MUTED).setMarginBottom(12));

        // ── Participants header (host + everyone who joined) ─────────────────────
        Participant host = participants.stream()
                .filter(p -> p.getRole() == ParticipantRole.ADMIN)
                .findFirst()
                .orElse(null);
        List<Participant> guests = participants.stream()
                .filter(p -> p.getRole() != ParticipantRole.ADMIN)
                .collect(Collectors.toList());

        Paragraph hostLine = new Paragraph()
                .setFontSize(9.5f).setMarginBottom(2);
        hostLine.add(new com.itextpdf.layout.element.Text("Host:  ")
                .setFont(bold).setFontColor(ACCENT));
        hostLine.add(new com.itextpdf.layout.element.Text(host != null ? host.getUsername() : "—")
                .setFont(normal).setFontColor(ColorConstants.DARK_GRAY));
        doc.add(hostLine);

        Paragraph joinedLine = new Paragraph()
                .setFontSize(9.5f).setMarginBottom(2);
        joinedLine.add(new com.itextpdf.layout.element.Text("Joined:  ")
                .setFont(bold).setFontColor(ACCENT));
        String joinedNames = guests.isEmpty()
                ? "—"
                : guests.stream().map(Participant::getUsername).collect(Collectors.joining(", "));
        joinedLine.add(new com.itextpdf.layout.element.Text(joinedNames)
                .setFont(normal).setFontColor(ColorConstants.DARK_GRAY));
        doc.add(joinedLine);

        doc.add(new Paragraph(participants.size() + " participant" + (participants.size() == 1 ? "" : "s") + " total")
                .setFontSize(8).setFontColor(MUTED).setMarginBottom(20).setMarginTop(2));

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
