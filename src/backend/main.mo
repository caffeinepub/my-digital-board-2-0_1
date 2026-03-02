import Text "mo:core/Text";
import Blob "mo:core/Blob";
import Array "mo:core/Array";
import List "mo:core/List";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";

actor {
  type CardId = Blob;
  type PersonName = Text;
  type Login = Text;
  type ShiftCoHost = Text;
  type ShiftPattern = Text;
  type Col = Text;
  type CreatedBy = Text;
  type CreatedAt = Text;
  type Title = Text;
  type Term = Text;

  type StaffingCard = {
    id : CardId;
    personName : PersonName;
    login : Login;
    shiftCoHost : ShiftCoHost;
    shiftPattern : ShiftPattern;
    col : Col;
    createdBy : CreatedBy;
    createdAt : CreatedAt;
  };

  type UniversityCard = {
    id : CardId;
    title : Title;
    term : Term;
    col : Col;
    createdBy : CreatedBy;
    createdAt : CreatedAt;
  };

  module StaffingCard {
    public func compare(a : StaffingCard, b : StaffingCard) : Order.Order {
      Text.compare(a.personName, b.personName);
    };
  };

  let staffingCards = List.empty<StaffingCard>();

  module UniversityCard {
    public func compare(a : UniversityCard, b : UniversityCard) : Order.Order {
      Text.compare(a.title, b.title);
    };
  };

  let universityCards = List.empty<UniversityCard>();

  var lastUpdated : Text = "";

  public shared ({ caller }) func saveAllStaffingCards(cards : [StaffingCard]) : async () {
    staffingCards.clear();
    staffingCards.addAll(cards.values());
  };

  public query ({ caller }) func getAllStaffingCards() : async [StaffingCard] {
    staffingCards.toArray().sort();
  };

  public shared ({ caller }) func saveAllUniversityCards(cards : [UniversityCard]) : async () {
    universityCards.clear();
    universityCards.addAll(cards.values());
  };

  public query ({ caller }) func getAllUniversityCards() : async [UniversityCard] {
    universityCards.toArray().sort();
  };

  public shared ({ caller }) func setLastUpdated(timestamp : Text) : async () {
    lastUpdated := timestamp;
  };

  public query ({ caller }) func getLastUpdated() : async Text {
    lastUpdated;
  };
};
