# Requirements Document

## Introduction

The livestock-reporting feature adds a report module to the existing livestock application for reviewing purchase, sales, and animal-weight records. The module supports report-specific filters, calculated summaries, clear empty and error states, and print-ready output of the currently filtered report. The feature uses the application's existing persisted records and does not change purchase, sale, inventory, or weight-entry workflows. Data-file export and application code changes are outside the scope of this requirements phase.

## Glossary

- **Livestock_Application**: The existing React/Vite, Express, and SQLite application used to manage livestock purchases, inventory, sales, and animal-weight records.
- **User**: A person who operates the Livestock_Application.
- **Report_Module**: The Livestock_Application area that provides the Purchase_Report, Sales_Report, and Animal_Weight_Report.
- **Report_Type**: One of Purchase_Report, Sales_Report, or Animal_Weight_Report.
- **Report_View**: The on-screen presentation of the selected Report_Type, applied filters, Report_Summary, and Filtered_Result_Set.
- **Purchase_Report**: A report generated from persisted Purchase_Records.
- **Sales_Report**: A report generated from persisted Sales_Records and associated purchase-cost data.
- **Animal_Weight_Report**: A report generated from persisted Weight_Records for one Animal_ID_Tag.
- **Purchase_Record**: A persisted purchase entry containing a purchase date, supplier, species, breed, quantity, unit cost, transport cost, notes, and batch identifier.
- **Sales_Record**: A persisted sale entry containing a sale date, customer, source batch, quantity, unit price, notes, revenue, cost, and profit.
- **Weight_Record**: A persisted animal-weight entry containing a unique identifier, Animal_ID_Tag, measurement date, Measurement_Type, weight in kilograms, source batch, livestock details, and notes.
- **Animal_ID_Tag**: The text identifier used to associate Weight_Records with one animal.
- **Measurement_Type**: The weekly or monthly classification assigned to a Weight_Record.
- **Date_Range**: Optional start and end dates whose populated boundaries are inclusive.
- **Purchase_Filter_Set**: A Date_Range plus optional supplier, species, and breed text filters.
- **Sales_Filter_Set**: A Date_Range plus optional customer, species, and breed text filters.
- **Weight_Filter_Set**: A required Animal_ID_Tag plus a Date_Range and an optional Measurement_Type.
- **Filtered_Result_Set**: The persisted records that satisfy every populated filter for the selected Report_Type.
- **Report_Summary**: Calculated values derived only from the current Filtered_Result_Set.
- **Total_Purchase_Cost**: The sum of quantity multiplied by unit cost plus transport cost for the applicable Purchase_Records.
- **Landed_Unit_Cost**: A Purchase_Record's unit cost plus transport cost divided by purchased quantity.
- **Total_Sales_Revenue**: The sum of quantity multiplied by unit price for the applicable Sales_Records.
- **Realized_Profit**: Total_Sales_Revenue minus the quantity-weighted Landed_Unit_Cost of the animals represented by the applicable Sales_Records.
- **Weight_Change**: The chronologically latest weight minus the chronologically earliest weight in the applicable Filtered_Result_Set.
- **Empty_State**: A Report_View presentation indicating that no persisted records satisfy the active filters.
- **Error_State**: A Report_View presentation indicating that validation or data retrieval prevented report generation.
- **Printable_Report**: A print-specific presentation of the current Report_View.

## Requirements

### Requirement 1: Access and Select Reports

**User Story:** As a livestock manager, I want one reporting area for operational records, so that I can review livestock activity without changing source records.

#### Acceptance Criteria

1. WHEN the User selects the reporting area, THE Report_Module SHALL display the Purchase_Report as the initial Report_Type.
2. THE Report_Module SHALL provide a selection control for the Purchase_Report, Sales_Report, and Animal_Weight_Report.
3. WHEN the User selects a Report_Type, THE Report_Module SHALL display the filters, Report_Summary, and result columns defined for the selected Report_Type.
4. WHEN the Report_Module displays a Report_View, THE Report_Module SHALL preserve the persisted Purchase_Records, Sales_Records, and Weight_Records without modification.

### Requirement 2: Filter and View Purchase Records

**User Story:** As a livestock manager, I want to filter purchase records and review purchase totals, so that I can evaluate livestock acquisition activity for a relevant period or source.

#### Acceptance Criteria

1. THE Purchase_Report SHALL provide optional purchase-date, supplier, species, and breed filters defined by the Purchase_Filter_Set.
2. WHEN the User applies a valid Purchase_Filter_Set, THE Purchase_Report SHALL include exactly the Purchase_Records that satisfy every populated purchase filter.
3. WHEN the User applies a supplier, species, or breed filter, THE Purchase_Report SHALL compare the trimmed filter text as a case-insensitive substring of the corresponding Purchase_Record field.
4. WHEN the Purchase_Report displays a non-empty Filtered_Result_Set, THE Purchase_Report SHALL display the batch identifier, purchase date, supplier, species, breed, quantity, unit cost, transport cost, and total cost for each Purchase_Record.
5. WHEN the Purchase_Report displays a Filtered_Result_Set, THE Report_Summary SHALL display the number of Purchase_Records in the Filtered_Result_Set.
6. WHEN the Purchase_Report displays a Filtered_Result_Set, THE Report_Summary SHALL display the sum of purchased quantity across the Filtered_Result_Set.
7. WHEN the Purchase_Report displays a Filtered_Result_Set, THE Report_Summary SHALL display Total_Purchase_Cost calculated from the Filtered_Result_Set.
8. WHEN the Purchase_Report displays multiple Purchase_Records, THE Purchase_Report SHALL order Purchase_Records by purchase date descending and batch identifier descending.

### Requirement 3: Filter and View Sales Records

**User Story:** As a livestock manager, I want to filter sales records and review revenue and profit totals, so that I can evaluate livestock sales performance for a relevant period or customer.

#### Acceptance Criteria

1. THE Sales_Report SHALL provide optional sale-date, customer, species, and breed filters defined by the Sales_Filter_Set.
2. WHEN the User applies a valid Sales_Filter_Set, THE Sales_Report SHALL include exactly the Sales_Records that satisfy every populated sales filter.
3. WHEN the User applies a customer, species, or breed filter, THE Sales_Report SHALL compare the trimmed filter text as a case-insensitive substring of the corresponding Sales_Record field.
4. WHEN the Sales_Report displays a non-empty Filtered_Result_Set, THE Sales_Report SHALL display the sale identifier, sale date, customer, source batch, species, breed, quantity, unit price, revenue, cost, and profit for each Sales_Record.
5. WHEN the Sales_Report displays a Filtered_Result_Set, THE Report_Summary SHALL display the number of Sales_Records in the Filtered_Result_Set.
6. WHEN the Sales_Report displays a Filtered_Result_Set, THE Report_Summary SHALL display the sum of sold quantity across the Filtered_Result_Set.
7. WHEN the Sales_Report displays a Filtered_Result_Set, THE Report_Summary SHALL display Total_Sales_Revenue calculated from the Filtered_Result_Set.
8. WHEN the Sales_Report displays a Filtered_Result_Set, THE Report_Summary SHALL display Realized_Profit calculated from the Filtered_Result_Set.
9. WHEN the Sales_Report displays multiple Sales_Records, THE Sales_Report SHALL order Sales_Records by sale date descending and sale identifier descending.

### Requirement 4: Check Animal Weight History

**User Story:** As a livestock manager, I want to check weight records by animal ID or tag and date, so that I can review an individual animal's measured growth over time.

#### Acceptance Criteria

1. THE Animal_Weight_Report SHALL provide a required Animal_ID_Tag filter, optional measurement-date boundaries, and an optional Measurement_Type filter defined by the Weight_Filter_Set.
2. WHEN the User applies a valid Weight_Filter_Set, THE Animal_Weight_Report SHALL include exactly the Weight_Records whose Animal_ID_Tag matches the trimmed filter text without case sensitivity and that satisfy every other populated weight filter.
3. WHEN the Animal_Weight_Report displays a non-empty Filtered_Result_Set, THE Animal_Weight_Report SHALL display the Animal_ID_Tag, measurement date, Measurement_Type, weight in kilograms, source batch, species, breed, and notes for each Weight_Record.
4. WHEN the Animal_Weight_Report displays a Filtered_Result_Set, THE Report_Summary SHALL display the number of Weight_Records in the Filtered_Result_Set.
5. WHEN the Animal_Weight_Report displays a non-empty Filtered_Result_Set, THE Report_Summary SHALL display the chronologically earliest weight and corresponding measurement date from the Filtered_Result_Set.
6. WHEN the Animal_Weight_Report displays a non-empty Filtered_Result_Set, THE Report_Summary SHALL display the chronologically latest weight and corresponding measurement date from the Filtered_Result_Set.
7. WHEN the Animal_Weight_Report displays at least two Weight_Records, THE Report_Summary SHALL display Weight_Change calculated from the Filtered_Result_Set.
8. WHEN the Animal_Weight_Report displays one Weight_Record, THE Report_Summary SHALL identify Weight_Change as unavailable because no comparison measurement exists.
9. WHEN the Animal_Weight_Report displays multiple Weight_Records, THE Animal_Weight_Report SHALL order Weight_Records by measurement date descending and Weight_Record identifier descending.

### Requirement 5: Validate Filters and Communicate Report States

**User Story:** As a livestock manager, I want clear validation, empty, and retrieval states, so that I can understand why a report has no visible results and recover from correctable problems.

#### Acceptance Criteria

1. WHEN a Date_Range contains only a start date, THE Report_Module SHALL include records dated on or after the start date.
2. WHEN a Date_Range contains only an end date, THE Report_Module SHALL include records dated on or before the end date.
3. WHEN a Date_Range contains both boundaries, THE Report_Module SHALL include records dated within the inclusive Date_Range.
4. IF a Date_Range start date occurs after the end date, THEN THE Report_Module SHALL display an Error_State identifying the required date order.
5. IF a Date_Range start date occurs after the end date, THEN THE Report_Module SHALL preserve the most recent valid Filtered_Result_Set until the Date_Range becomes valid.
6. IF the User requests an Animal_Weight_Report without an Animal_ID_Tag, THEN THE Animal_Weight_Report SHALL display an Error_State identifying the required Animal_ID_Tag.
7. WHEN no persisted records satisfy a valid filter set, THE Report_Module SHALL display an Empty_State that identifies the selected Report_Type and recommends adjusting or clearing filters.
8. IF report data retrieval fails, THEN THE Report_Module SHALL display an Error_State containing a retry action and a message that report data could not be loaded.
9. WHEN the User activates the retry action, THE Report_Module SHALL issue a new retrieval request for the selected Report_Type and active valid filters.
10. WHEN the User clears filters, THE Report_Module SHALL remove every optional filter value from the selected Report_Type.
11. WHEN the User clears Animal_Weight_Report filters, THE Animal_Weight_Report SHALL display the required Animal_ID_Tag field without a value.

### Requirement 6: Present and Print Filtered Reports

**User Story:** As a livestock manager, I want reports to be readable on screen and printable, so that I can review results in the application or retain a practical paper or PDF copy.

#### Acceptance Criteria

1. WHEN the Report_Module displays a generated report, THE Report_View SHALL present the active filters, Report_Summary, and Filtered_Result_Set together.
2. WHEN the Report_View width cannot contain all result columns, THE Report_View SHALL provide horizontal access to every result column without hiding record values.
3. WHEN the Report_View contains a non-empty Filtered_Result_Set, THE Report_Module SHALL provide a print action.
4. WHEN the User activates the print action, THE Report_Module SHALL generate a Printable_Report from the current Filtered_Result_Set.
5. WHEN the Report_Module generates a Printable_Report, THE Printable_Report SHALL display the Report_Type title and generation date.
6. WHEN the Report_Module generates a Printable_Report, THE Printable_Report SHALL display every populated filter applied to the current Filtered_Result_Set.
7. WHEN the Report_Module generates a Printable_Report, THE Printable_Report SHALL display the current Report_Summary and every record visible in the current Filtered_Result_Set.
8. WHEN a Printable_Report spans multiple printed pages, THE Printable_Report SHALL repeat the report column headings on each page containing result rows.
9. WHEN the Report_Module generates a Printable_Report, THE Printable_Report SHALL omit application navigation, filter controls, retry actions, and record-management controls.
10. WHILE the Report_View contains an Empty_State or Error_State, THE Report_Module SHALL disable the print action.

### Requirement 7: Maintain Report Data Consistency

**User Story:** As a livestock manager, I want report values to agree with operational records, so that I can rely on reports for routine livestock review.

#### Acceptance Criteria

1. WHEN the User generates or refreshes a report, THE Report_Module SHALL derive the Filtered_Result_Set from the persisted records available at the time of the retrieval request.
2. WHEN the Purchase_Report calculates Total_Purchase_Cost, THE Purchase_Report SHALL use each Purchase_Record's purchased quantity, unit cost, and transport cost.
3. WHEN the Sales_Report calculates Total_Sales_Revenue, THE Sales_Report SHALL use each Sales_Record's sold quantity and unit price.
4. WHEN the Sales_Report calculates Realized_Profit, THE Sales_Report SHALL use each Sales_Record's sold quantity, unit price, and source Purchase_Record Landed_Unit_Cost.
5. WHEN the Animal_Weight_Report calculates Weight_Change, THE Animal_Weight_Report SHALL use the chronologically earliest and latest Weight_Records in the current Filtered_Result_Set.
6. WHEN two Weight_Records for the same Animal_ID_Tag have the same measurement date, THE Animal_Weight_Report SHALL treat the Weight_Record with the greater identifier as chronologically later for summary calculations.
