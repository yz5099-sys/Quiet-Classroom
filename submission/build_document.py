from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Inches, Pt, RGBColor
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from pathlib import Path
out=Path(__file__).parent
D=Document(); S=D.sections[0]
S.top_margin=S.bottom_margin=Inches(.7); S.left_margin=S.right_margin=Inches(.8)
S.page_width=Inches(8.5);S.page_height=Inches(11)
for name in ['Normal','Title','Subtitle','Heading 1','Heading 2']:
 st=D.styles[name];st.font.name='Calibri';st.font.color.rgb=RGBColor(0,0,0)

for st in D.styles:
 for border in list(st.element.xpath('.//w:pBdr')):
  border.getparent().remove(border)
normal=D.styles['Normal'];normal.font.size=Pt(11);normal.paragraph_format.space_after=Pt(7);normal.paragraph_format.line_spacing=1.08
D.styles['Caption'].font.color.rgb=RGBColor(0,0,0)
D.styles['Caption'].font.size=Pt(9)
D.styles['Caption'].font.italic=False
D.styles['Title'].font.size=Pt(27); D.styles['Title'].paragraph_format.space_after=Pt(8)
D.styles['Heading 1'].font.size=Pt(13);D.styles['Heading 1'].paragraph_format.space_before=Pt(11);D.styles['Heading 1'].paragraph_format.space_after=Pt(5)
D.add_heading('Quiet Classroom',0)
D.add_paragraph('Interactive Web Design Reflection',style='Subtitle')
D.add_heading('Idea and design intentions',1)
D.add_paragraph('Quiet Classroom is an interactive website that encourages a quieter study environment through a sleeping fish. Instead of displaying only a warning or a number, the page turns classroom sound into a small story: staying quiet lets the fish rest, while sustained noise wakes it up. The intention is to make self regulation feel gentle, playful, and easy to understand.')
D.add_paragraph('The interface pairs an illustrated room and aquarium with a study control panel. Soft gradients, rounded shapes, translucent surfaces, and warm furniture create a calm atmosphere. The window and background change with the local time of day. A live sound meter, quiet time, score, and session summary give feedback. Manual, duration, and scheduled modes support different study routines, while a sensitivity slider lets users adjust the response to their environment.')
D.add_heading('How I used AI tools',1)
D.add_paragraph('I used ChatGPT and Codex to help develop and revise the website. My requests focused on an interactive Quiet Classroom experience and, in this revision, a more lively fish, clearer visual design, and a review of unreasonable behavior or code bugs. I also asked AI to organize the CSS and JavaScript, prepare this reflection, translate the complete interface into English, and add screenshots with gameplay instructions.')
D.add_paragraph('AI provided the HTML interface, CSS room and fish artwork, and JavaScript for microphone input, sound level feedback, timing, scoring, and the result dialog. The original repository stored its CSS and JavaScript inside the HTML rather than as separate files. During this revision, AI extracted them into style.css and script.js and updated the HTML links so the structure, presentation, and behavior are easier to inspect and maintain.')
D.add_paragraph('My contribution was to set the concept, choose the quiet study scenario, and direct the next changes: improve the fish character and review the interaction logic. I used AI as an implementation assistant and requested another review rather than treating the generated code as finished. The revision added breathing, fin and tail animation to the fish and improved the panel hierarchy. AI also corrected microphone cleanup, cancellation during startup, repeated noise counting, and simulated sound scoring. I requested these refinements so the visual idea and the session behavior work together.')
D.add_heading('HTML and CSS work',1)
p=D.add_paragraph('GitHub repository: ')
url='https://github.com/yz5099-sys/Quiet-Classroom'
rid=p.part.relate_to(url,'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink',is_external=True)
h=OxmlElement('w:hyperlink');h.set(qn('r:id'),rid);r=OxmlElement('w:r');pr=OxmlElement('w:rPr');c=OxmlElement('w:color');c.set(qn('w:val'),'176B69');pr.append(c);r.append(pr);t=OxmlElement('w:t');t.text=url;r.append(t);h.append(r);p._p.append(h)
D.add_paragraph('Files: index.html for structure, style.css for visual design, and script.js for interaction. The sound percentage is a relative microphone level, not a calibrated decibel measurement.')

# Add the deployed website alongside the source repository.
p=D.add_paragraph('Live website: ')
url='https://quiet-classroom.vercel.app/'
rid=p.part.relate_to(url,'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink',is_external=True)
h=OxmlElement('w:hyperlink');h.set(qn('r:id'),rid);r=OxmlElement('w:r');t=OxmlElement('w:t');t.text=url;r.append(t);h.append(r);p._p.append(h)

assets=out.parent/'design'/'screenshots'
def screenshot(filename, width, alt):
 p=D.add_paragraph();p.alignment=WD_ALIGN_PARAGRAPH.CENTER
 p.paragraph_format.space_before=Pt(4);p.paragraph_format.space_after=Pt(4)
 shape=p.add_run().add_picture(str(assets/filename),width=Inches(width))
 shape._inline.docPr.set('descr',alt)
 return p

def caption(text):
 p=D.add_paragraph(text,style='Caption');p.paragraph_format.space_after=Pt(8)
 return p

D.add_page_break()
D.add_heading('How to play',1)
D.add_paragraph('Your goal is to protect the fish’s sleep by keeping the room quiet during a study session. Figure 1 shows where to select a mode, adjust the noise threshold, and start.')
screenshot('01-overview.png',6.65,'English desktop interface with the aquarium on the left and study controls on the right')
caption('Figure 1  The English interface before a session begins')
steps=[
('Choose a session', 'Select Manual start / end for an open session, Timed session for 1 to 1440 minutes, or Scheduled session for local start and end times. Keep this page open for a scheduled session.'),
('Start and adjust', 'Select Start session and allow microphone access. Watch Room volume and adjust Noise threshold for the room. This percentage is a relative level, not a decibel reading.'),
('Keep the fish asleep', 'Quiet time earns points, with a bonus for longer quiet streaks. Sustained sound wakes the fish and subtracts 25 points, without taking the score below zero.'),
('Finish or explore', 'Select End to see the session summary, or Reset to clear the session. Try the demo first works without a microphone; Simulate a sound demonstrates the response. Demo sessions do not earn points or record quiet time and wake-ups.'),
]
for title,body in steps:
 p=D.add_paragraph();p.add_run(title+'. ').bold=True;p.add_run(body)

D.add_page_break()
D.add_heading('Sound response and session results',1)
D.add_paragraph('Sound above the selected threshold for 0.3 seconds wakes the fish. The open eye, faster swimming, alert, and Room volume meter make the change visible together. Continuous noise counts as one wake-up. After 1.4 seconds below 90 percent of the threshold, the fish settles back to sleep.')
screenshot('02-noise-response.png',5.4,'The awake fish, noise alert, high sound meter, and one recorded wake-up')
caption('Figure 2  Noise feedback captured using controlled microphone test input')
screenshot('03-session-results.png',3.0,'The completed session dialog showing total score, quiet time, longest quiet streak, and wake-ups')
caption('Figure 3  End opens a summary of the completed session')
D.add_paragraph('Select Done to close the summary and start again. Screenshots use controlled test sound, without classroom recordings. Mobile and night views are available in design/screenshots.')

D.core_properties.title='Quiet Classroom Interactive Web Design Reflection';D.core_properties.author='';D.core_properties.subject='Design intentions and AI assisted development'
D.save(out/'Quiet_Classroom_Design_Reflection.docx')

D.save(out.parent/'design'/'Quiet_Classroom_Design_With_Screenshots_and_Gameplay.docx')
