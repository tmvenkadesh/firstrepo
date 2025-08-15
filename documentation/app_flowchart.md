flowchart TD
    Start[Start]
    Load[Load index HTML]
    Render[Render static page]
    Choose{Select option}
    Doc[Open documentation]
    License[View license]
    Issues[View issues or hotfix notes]
    End[End]

    Start --> Load
    Load --> Render
    Render --> Choose
    Choose --> Doc
    Choose --> License
    Choose --> Issues
    Doc --> End
    License --> End
    Issues --> End