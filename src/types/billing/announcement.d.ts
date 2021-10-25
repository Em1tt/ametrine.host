export interface Announcement {
    readonly announcement_id    : number;
    readonly announcementType   : string;
    announcementText            : string | boolean;
    readonly deleteIn           : string | number | Date;
    readonly showToCustomersOnly: number | boolean;
    readonly dateCreated        : string; // Should be Date but dont know
}
