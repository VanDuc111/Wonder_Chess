/**
 * @fileoverview Settings Modal Manager
 * Syncs settings between inline panel (desktop) and modal (tablet/mobile)
 */

document.addEventListener('DOMContentLoaded', () => {
    // Mapping between inline switches and modal switches
    const switchMappings = [
        { inline: 'flip-board-switch', modal: 'flip-board-switch-modal' },
        { inline: 'best-move-switch', modal: 'best-move-switch-modal' },
        { inline: 'move-notate-switch', modal: 'move-notate-switch-modal' },
        { inline: 'eval-bar-switch', modal: 'eval-bar-switch-modal' }
    ];

    // Sync from inline to modal when modal opens
    const settingsModal = document.getElementById('settingsModal');
    if (settingsModal) {
        settingsModal.addEventListener('show.bs.modal', () => {
            switchMappings.forEach(mapping => {
                const inlineSwitch = document.getElementById(mapping.inline);
                const modalSwitch = document.getElementById(mapping.modal);
                if (inlineSwitch && modalSwitch) {
                    modalSwitch.checked = inlineSwitch.checked;
                }
            });
        });
    }

    // Sync from modal to inline when switches change in modal
    switchMappings.forEach(mapping => {
        const modalSwitch = document.getElementById(mapping.modal);
        if (modalSwitch) {
            modalSwitch.addEventListener('change', (e) => {
                const inlineSwitch = document.getElementById(mapping.inline);
                if (inlineSwitch) {
                    inlineSwitch.checked = e.target.checked;
                    // Trigger change event on inline switch to activate its functionality
                    inlineSwitch.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
        }
    });

    // Also sync from inline to modal in real-time (for desktop users who might switch to tablet view)
    switchMappings.forEach(mapping => {
        const inlineSwitch = document.getElementById(mapping.inline);
        if (inlineSwitch) {
            inlineSwitch.addEventListener('change', (e) => {
                const modalSwitch = document.getElementById(mapping.modal);
                if (modalSwitch) {
                    modalSwitch.checked = e.target.checked;
                }
            });
        }
    });
});
