import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type ShiftCoHost = string;
export type ShiftPattern = string;
export type Col = string;
export type Term = string;
export type Title = string;
export type CreatedBy = string;
export type CreatedAt = string;
export interface UniversityCard {
    id: CardId;
    col: Col;
    title: Title;
    createdAt: CreatedAt;
    createdBy: CreatedBy;
    term: Term;
}
export interface StaffingCard {
    id: CardId;
    col: Col;
    shiftCoHost: ShiftCoHost;
    createdAt: CreatedAt;
    createdBy: CreatedBy;
    personName: PersonName;
    login: Login;
    shiftPattern: ShiftPattern;
}
export type PersonName = string;
export type Login = string;
export type CardId = Uint8Array;
export interface backendInterface {
    getAllStaffingCards(): Promise<Array<StaffingCard>>;
    getAllUniversityCards(): Promise<Array<UniversityCard>>;
    getLastUpdated(): Promise<string>;
    saveAllStaffingCards(cards: Array<StaffingCard>): Promise<void>;
    saveAllUniversityCards(cards: Array<UniversityCard>): Promise<void>;
    setLastUpdated(timestamp: string): Promise<void>;
}
